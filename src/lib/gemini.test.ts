import { describe, expect, it } from "vitest";
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
});
