import { describe, expect, it } from "vitest";
import { createPhysicianUploadedEvidence } from "./consent-demo";
import { generateQA, PATIENT_EXPLANATION_GEMINI_MODEL, PATIENT_QA_GEMINI_MODEL, shouldUseLiveGemini } from "./gemini";

describe("Gemini adapter evidence guardrails", () => {
  it("uses Gemini 3.5 Flash for patient Q&A and Gemini Omni for patient explanation", () => {
    expect(PATIENT_QA_GEMINI_MODEL).toBe("gemini-3.5-flash");
    expect(PATIENT_EXPLANATION_GEMINI_MODEL).toBe("gemini-omni");
  });

  it("forces deterministic fallback in explicit anonymous demo mode even when a Gemini key is configured", () => {
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured", CONSENT_AGENT_DEMO_MODE: "true" })).toBe(false);
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured", CONSENT_AGENT_DEMO_MODE: "1" })).toBe(false);
    expect(shouldUseLiveGemini({ GEMINI_API_KEY: "configured" })).toBe(true);
    expect(shouldUseLiveGemini({})).toBe(false);
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
