import { describe, expect, it } from "vitest";
import { normalizePhysicianSourceUrl } from "../app/api/evidence/upload/route";
import { createAutoPhysicianUrlEvidence, synthesizeEvidenceBoundQA, type EvidenceCard } from "./consent-demo";

describe("JCS physician-uploaded guideline smoke", () => {
  it("answers from a physician-uploaded JCS guideline evidence card", () => {
    const jcsEvidence: EvidenceCard = {
      evidenceId: "UP-JCS2020-OGINO",
      title: "2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン（日本循環器学会）",
      sourceType: "Uploaded",
      claim: "日本循環器学会の大動脈瘤・大動脈解離診療ガイドライン。急性A型大動脈解離では死亡、脳梗塞、腎不全、出血を説明対象に含める。",
      displayForFamily: "急性A型大動脈解離では死亡、脳梗塞、腎不全、出血を説明対象に含める。",
      confidence: "moderate",
      citation: "日本循環器学会 2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン / JCS2020_Ogino.pdf",
      pmid: "非PubMed/医師アップロード",
      origin: "physician-upload",
      retrievalStatus: "physician-uploaded",
      uploadedFileName: "JCS2020_Ogino.pdf",
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      clinicalScope: "日本循環器学会 大動脈瘤・大動脈解離診療ガイドライン / 急性A型大動脈解離",
      clinicianSummary: "医師確認済みアップロード資料として急性A型大動脈解離の説明根拠に使う。",
      keyFindings: ["死亡、脳梗塞、腎不全、出血を説明対象に含める。"],
      quotedSpan: "死亡、脳梗塞、腎不全、出血を説明対象に含める。",
      outcomeTags: ["guideline", "mortality", "stroke", "renal-failure", "bleeding"],
    };

    const result = synthesizeEvidenceBoundQA("脳梗塞のリスクはありますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["死亡", "脳梗塞", "腎不全", "出血"],
      selectedEvidence: [jcsEvidence],
    });

    expect(result.answer).toContain("脳梗塞");
    expect(result.evidenceReferences).toEqual(["UP-JCS2020-OGINO"]);
    expect(result.retrievedEvidence?.[0].origin).toBe("physician-upload");
    expect(result.retrievedEvidence?.[0].retrievalStatus).toBe("physician-uploaded");
  });
});

describe("JCS URL auto evidence import", () => {
  it("normalizes a mobile pasted filename plus URL into the HTTPS PDF URL", () => {
    expect(normalizePhysicianSourceUrl("JCS2020_Ogino.pdf https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf")).toBe(
      "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
    );
  });

  it("builds a physician-ready evidence card from just the JCS URL when production PDF extraction is slow", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText: "",
    });

    expect(evidence.title).toContain("大動脈瘤・大動脈解離診療ガイドライン");
    expect(evidence.displayForFamily).toContain("緊急手術");
    expect(evidence.keyFindings?.join(" ")).toContain("迅速");
    expect(evidence.outcomeTags).toEqual(expect.arrayContaining(["guideline", "emergency-surgery", "mortality", "stroke"]));
  });

  it("builds a physician-ready evidence card from just the JCS URL and extracted text", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText:
        "2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン。急性A型解離では緊急手術が示され、急性大動脈解離の診断後は専門チームによる迅速な判断および治療が必要。脳梗塞、死亡、腎不全、出血などの重篤な合併症も説明対象となる。",
    });

    expect(evidence.title).toContain("大動脈瘤・大動脈解離診療ガイドライン");
    expect(evidence.sourceUrl).toContain("JCS2020_Ogino.pdf");
    expect(evidence.origin).toBe("physician-upload");
    expect(evidence.retrievalStatus).toBe("physician-uploaded");
    expect(evidence.clinicianSummary).toContain("急性A型大動脈解離");
    expect(evidence.displayForFamily).toContain("迅速");
    expect(evidence.keyFindings?.join(" ")).toContain("緊急手術");
    expect(evidence.outcomeTags).toEqual(expect.arrayContaining(["guideline", "emergency-surgery", "mortality", "stroke"]));
  });
});
