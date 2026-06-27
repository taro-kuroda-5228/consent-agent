import { describe, expect, it } from "vitest";
import { createPhysicianUploadedEvidence } from "./consent-demo";
import { generateExplanation, generateQA, DOCTOR_SUMMARY_GEMINI_MODEL, PATIENT_EXPLANATION_GEMINI_MODEL, PATIENT_QA_GEMINI_MODEL, shouldUseLiveGemini } from "./gemini";

describe("Gemini adapter evidence guardrails", () => {
  it("uses Gemini 3 or newer model ids for patient explanation, patient Q&A, and doctor summary", () => {
    const models = [PATIENT_EXPLANATION_GEMINI_MODEL, PATIENT_QA_GEMINI_MODEL, DOCTOR_SUMMARY_GEMINI_MODEL];
    expect(models).toEqual(["gemini-3.5-flash", "gemini-3.5-flash", "gemini-3.5-flash"]);
    for (const model of models) {
      expect(model).toMatch(/^gemini-3/);
      expect(model).toContain("flash");
      expect(model).not.toContain("pro");
      expect(model).not.toContain("omni");
      expect(model).not.toMatch(/^gemini-2/);
    }
  });

  it("forces deterministic fallback in explicit anonymous demo mode even when a Gemini key is configured", () => {
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured", CONSENT_AGENT_DEMO_MODE: "true" })).toBe(false);
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured", CONSENT_AGENT_DEMO_MODE: "1" })).toBe(false);
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured" })).toBe(true);
    expect(shouldUseLiveGemini({})).toBe(false);
  });

  it("treats Vertex AI configuration as a live-Gemini credential", () => {
    expect(shouldUseLiveGemini({ GOOGLE_GENAI_USE_VERTEXAI: "true", GOOGLE_CLOUD_PROJECT: "demo-project" })).toBe(true);
    expect(shouldUseLiveGemini({ GOOGLE_GENAI_USE_VERTEXAI: "true" })).toBe(false);
    expect(shouldUseLiveGemini({ GOOGLE_GENAI_USE_VERTEXAI: "true", GOOGLE_CLOUD_PROJECT: "demo-project", CONSENT_AGENT_DEMO_MODE: "true" })).toBe(false);
  });

  it("builds the Gemini explanation as a six-step clinical AI explanation screen contract", async () => {
    const cards = await generateExplanation({
      diagnosis: "急性Stanford A型大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["死亡", "脳梗塞", "出血", "輸血", "腎不全", "意識障害", "多臓器不全"],
      urgency: "超緊急",
      purpose: "破裂・心タンポナーデ・臓器血流障害を防ぐ",
      cardiopulmonaryBypass: true,
      transfusion: "必要になる可能性が高い",
      notes: "本人は説明困難で家族向け説明",
      selectedEvidence: [],
    });

    expect(cards.map((card: { id: string }) => card.id)).toEqual([
      "disease-mechanism",
      "emergency-need",
      "procedure",
      "major-risks",
      "no-surgery",
      "doctor-confirmation",
    ]);
    expect(cards.every((card: { audioNarration?: string; visualId?: string }) => card.audioNarration && card.visualId)).toBe(true);
    expect(cards[3].content).toContain("死亡");
    expect(cards[3].content).toContain("脳梗塞");
    expect(cards[3].content).toContain("腎不全");
    expect(cards[4].content).toContain("手術しない場合");
    expect(JSON.stringify(cards)).not.toContain("動画ストーリーボード");
    expect(JSON.stringify(cards)).not.toContain("CT画像");
  });

  it("does not fall back to default evidence when the physician explicitly selected no references", async () => {
    const result = await generateQA("脳梗塞のリスクについて教えてください。", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["脳梗塞"],
      selectedEvidence: [],
    });

    expect(result.answer).toContain("選択済み参考資料内には、この質問に直接答えられる記載が見つかりません");
    expect(result.answer).not.toContain("術後脳卒中は5%");
    expect(result.evidenceReferences).toEqual([]);
    expect(result.retrievedEvidence).toEqual([]);
    expect(result.requiresDoctorReview).toBe(true);
  });

  it("runs source-bounded span extraction before synthesizing the final answer", async () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Neurocognitive recovery note",
      fileName: "neurocognitive-recovery.pdf",
      extractedText: "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery.",
      keyFindings: ["Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery."],
    });

    const result = await generateQA(
      "術後に頭がぼーっとすることはどれくらいありますか？",
      {
        diagnosis: "術後回復",
        plannedSurgery: "未指定の手術",
        risks: ["せん妄"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      async () => ({
        answerable: true,
        confidence: "moderate",
        reason: "Selected source directly reports postoperative delirium frequency.",
        supportingSpans: [
          {
            evidenceId: uploaded.evidenceId,
            chunkId: "chunk-1",
            span: "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery.",
          },
        ],
      }),
    );

    expect(result.answer).toContain("22%");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.supportingSpans?.[0]?.text).toContain("Postoperative delirium");
    expect(result.extractionMode).toBe("agentic-source-bounded");
  });

  it("passes a MedEvidence-style source-bounded search plan into the agentic extractor", async () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Outcomes of hemi- vs. total arch replacement in acute type A aortic dissection",
      fileName: "arch-comparison.pdf",
      extractedText: "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
      keyFindings: ["In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement."],
      outcomeTags: ["arch-strategy", "late-mortality", "comparative-outcomes"],
    });

    let capturedPlan: unknown;
    const result = await generateQA(
      "ヘミアーチとトータルアーチの長期予後の差は？",
      {
        diagnosis: "Stanford A型急性大動脈解離",
        plannedSurgery: "弓部置換術",
        risks: ["死亡"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      async (_question, _context, plan) => {
        capturedPlan = plan;
        return {
          answerable: true,
          confidence: "moderate",
          reason: "The selected paper directly compares late mortality between hemiarch and total arch replacement.",
          supportingSpans: [
            {
              evidenceId: uploaded.evidenceId,
              chunkId: "chunk-1",
              span: "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
            },
          ],
        };
      },
    );

    expect(result.answer).toMatch(/higher late mortality rate|遠隔期死亡率.*高/);
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(capturedPlan).toMatchObject({
      strategy: "source-bounded-agentic-search",
      boundary: "physician-selected-evidence-only",
      queries: expect.arrayContaining([
        expect.objectContaining({ query: expect.stringContaining("long-term") }),
        expect.objectContaining({ query: expect.stringContaining("late mortality") }),
      ]),
      candidateChunks: expect.arrayContaining([
        expect.objectContaining({ evidenceId: uploaded.evidenceId, chunkId: "chunk-1" }),
      ]),
    });
  });

  it("expands HAR/TAR abbreviations in the MedEvidence-style source-bounded search plan", async () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Outcomes of hemi- vs. total arch replacement in acute type A aortic dissection",
      fileName: "arch-comparison.pdf",
      extractedText: "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
      keyFindings: ["In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement."],
      outcomeTags: ["arch-strategy", "late-mortality", "comparative-outcomes"],
    });

    let capturedPlan: unknown;
    await generateQA(
      "HARとTARの予後の差は？",
      {
        diagnosis: "Stanford A型急性大動脈解離",
        plannedSurgery: "弓部置換術",
        risks: ["死亡"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      async (_question, _context, plan) => {
        capturedPlan = plan;
        return {
          answerable: true,
          confidence: "moderate",
          reason: "The selected paper directly compares late mortality between hemiarch and total arch replacement.",
          supportingSpans: [
            {
              evidenceId: uploaded.evidenceId,
              chunkId: "chunk-1",
              span: "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
            },
          ],
        };
      },
    );

    const serializedPlan = JSON.stringify(capturedPlan);
    expect(serializedPlan).toContain("HAR");
    expect(serializedPlan).toContain("TAR");
    expect(serializedPlan).toContain("hemiarch");
    expect(serializedPlan).toContain("total arch");
    expect(serializedPlan).toContain("late mortality");
  });
});
