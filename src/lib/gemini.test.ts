import { describe, expect, it } from "vitest";
import { createPhysicianUploadedEvidence } from "./consent-demo";
import { generateQA } from "./gemini";

describe("Gemini adapter evidence guardrails", () => {
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
});
