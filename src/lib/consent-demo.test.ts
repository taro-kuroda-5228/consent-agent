import { describe, expect, it } from "vitest";
import {
  buildConsentExport,
  generateExplanationCards,
  getDefaultCase,
  retrieveMockEvidence,
  scoreUnderstandingCheck,
} from "./consent-demo";

describe("consent demo utilities", () => {
  it("retrieves PMID-backed mock evidence for acute type A dissection", () => {
    const evidence = retrieveMockEvidence("acute type A aortic dissection emergency surgery");

    expect(evidence.length).toBeGreaterThanOrEqual(2);
    expect(evidence.every((item) => item.pmid && item.citation)).toBe(true);
    expect(evidence[0].sourceType).toMatch(/Registry|Guideline/);
  });

  it("generates family-facing explanation cards linked to evidence", () => {
    const demoCase = getDefaultCase();
    const evidence = retrieveMockEvidence(demoCase.diagnosis);
    const cards = generateExplanationCards(demoCase, evidence);

    expect(cards).toHaveLength(4);
    expect(cards[0].audience).toBe("family");
    expect(cards.flatMap((card) => card.evidenceIds)).toContain(evidence[0].evidenceId);
    expect(cards.some((card) => card.doctorReviewRequired)).toBe(true);
  });

  it("scores understanding check and flags doctor review when safety-critical answer is missed", () => {
    const result = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: false,
      doctorQuestion: "成功率を断定できますか？",
    });

    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.requiresDoctorReview).toBe(true);
    expect(result.safetyFlags).toContain("個別予後・成功率の断定は医師確認が必要");
  });

  it("builds a FHIR Consent-like export without real patient identifiers", () => {
    const demoCase = getDefaultCase();
    const evidence = retrieveMockEvidence(demoCase.diagnosis);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "術後の集中治療は必要ですか？",
    });
    const payload = buildConsentExport(demoCase, evidence, cards, check);

    expect(payload.resourceType).toBe("Consent");
    expect(payload.status).toBe("draft");
    expect(payload.patient.reference).toBe("Patient/demo-anonymous");
    expect(payload.sourceAttachment.title).toContain("MedEvidence Consent Agent");
    expect(JSON.stringify(payload)).not.toContain("Taro");
  });
});
