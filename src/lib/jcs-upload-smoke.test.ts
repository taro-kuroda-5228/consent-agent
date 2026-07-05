import { describe, expect, it } from "vitest";
import { normalizePhysicianSourceUrl } from "../app/api/evidence/upload/route";
import { createAutoPhysicianUrlEvidence, synthesizeEvidenceBoundQA, type EvidenceCard } from "./consent-demo";
import { selectRelevantEvidenceText } from "./source-url-evidence";

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

  it("keeps extracted JCS guideline details answerable instead of reducing the long PDF to one generic sentence", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText:
        "2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン。急性A型解離では緊急手術が示され、急性大動脈解離の診断後は専門チームによる迅速な判断および治療が必要。術後合併症として脳梗塞、死亡、腎不全、出血を確認し、腎不全は術後に透析や集中治療を要する場合があるため家族へ説明する。",
    });

    const result = synthesizeEvidenceBoundQA("腎不全になると何が問題になりますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["腎不全"],
      selectedEvidence: [evidence],
    });

    expect(evidence.claim).toContain("透析や集中治療");
    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("透析や集中治療");
    expect(result.evidenceReferences).toEqual([evidence.evidenceId]);
    expect(result.supportingSpans?.[0]?.text).toContain("透析や集中治療");
  });

  it("uses the family question to pull an edge-topic snippet from a long guideline instead of only the generic top slices", () => {
    const genericFrontMatter = "急性A型大動脈解離 緊急手術 死亡 脳梗塞 腎不全 出血。".repeat(250);
    const edgeTopic = "妊娠中の大動脈解離では、母体と胎児の状態を考慮して治療方針を個別に判断する。";
    const longGuidelineText = `${genericFrontMatter} -- 120 of 225 -- ${edgeTopic}`;

    const genericExtraction = selectRelevantEvidenceText(longGuidelineText);
    const questionSpecificExtraction = selectRelevantEvidenceText(longGuidelineText, "妊娠中だったら治療方針は変わりますか？");

    expect(genericExtraction).not.toContain(edgeTopic);
    expect(questionSpecificExtraction).toContain(edgeTopic);
  });

  it("indexes arbitrary long-guideline pages and retrieves the page matching the family question without hard-coded page numbers", () => {
    const frontMatter = "急性A型大動脈解離 緊急手術 死亡 脳梗塞 腎不全 出血。".repeat(300);
    const unrelatedMiddle = "-- 49 of 225 -- Marfan症候群では大動脈径や家族歴を考慮して手術適応を検討する。";
    const targetPage = "-- 142 of 225 -- 脊髄虚血や対麻痺を減らすためには、肋間動脈やAdamkiewicz動脈など脊髄血流を保つ配慮が重要である。";
    const longGuidelineText = `${frontMatter} ${unrelatedMiddle} ${"術後管理。".repeat(200)} ${targetPage}`;

    const questionSpecificExtraction = selectRelevantEvidenceText(longGuidelineText, "対麻痺を防ぐために何に気をつけますか？");

    expect(questionSpecificExtraction).toContain("-- 142 of 225 --");
    expect(questionSpecificExtraction).toContain("脊髄血流");
    expect(questionSpecificExtraction).not.toContain("Marfan症候群では大動脈径");
  });

  it("carries the nearest chapter heading into a retrieved long-guideline span for doctor traceability", () => {
    const longGuidelineText = [
      "-- 70 of 225 -- 第 6 章 大動脈解離の治療 1. 急性大動脈解離の初期対応。血圧管理と緊急手術の総論を説明する。",
      "-- 71 of 225 -- 術前検査、搬送、麻酔準備について説明する。",
      "-- 72 of 225 -- 脊髄虚血や対麻痺を減らすためには、脊髄血流を保つ配慮と術後の神経所見確認が重要である。",
    ].join(" ");

    const questionSpecificExtraction = selectRelevantEvidenceText(longGuidelineText, "対麻痺を防ぐために何に気をつけますか？");

    expect(questionSpecificExtraction).toContain("第 6 章 大動脈解離の治療");
    expect(questionSpecificExtraction).toContain("-- 72 of 225 --");
    expect(questionSpecificExtraction).toContain("脊髄血流を保つ配慮");
  });

  it("prefers explanatory prose over complication-list/table noise when both mention the same term", () => {
    const tableNoise = "-- 16 of 225 -- P. 26 A 85 34) malperfusion Adamkiewicz DIC 分類 3 表 3 脳虚血 胸腔内出血 腹腔内出血 心タンポナーデ 冠虚血 肝虚血 腸管虚血 脊髄虚血 腎虚血 下肢虚血 出血性合併症 虚血性合併症";
    const targetProse = "-- 72 of 225 -- 第 6 章 大動脈解離の治療 脊髄虚血や対麻痺を減らすためには、脊髄血流を保つ配慮と術後の神経所見確認が重要である。";
    const extracted = selectRelevantEvidenceText(`${tableNoise} ${targetProse}`, "対麻痺を防ぐために何に気をつけますか？");

    expect(extracted).toContain("第 6 章 大動脈解離の治療");
    expect(extracted).toContain("脊髄血流を保つ配慮");
    expect(extracted.indexOf("脊髄血流を保つ配慮")).toBeLessThan(extracted.indexOf("分類 3 表 3") === -1 ? Number.POSITIVE_INFINITY : extracted.indexOf("分類 3 表 3"));
  });

  it("uses the explanatory selected guideline span as the QA supporting span instead of earlier table noise", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText: [
        "-- 16 of 225 -- P. 26 A 85 34) malperfusion Adamkiewicz DIC 分類 3 表 3 脳虚血 胸腔内出血 心タンポナーデ 冠虚血 腸管虚血 脊髄虚血 腎虚血 下肢虚血 出血性合併症 虚血性合併症",
        "-- 130 of 225 -- 第 7 章 大動脈手術に伴う諸問題 分節動脈盗血の防止と灌流 脊髄虚血や対麻痺を減らすためには、脊髄血流を保つ配慮と術後の神経所見確認が重要である",
      ].join(" --- "),
    });

    const result = synthesizeEvidenceBoundQA("対麻痺を防ぐために何に気をつけますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["対麻痺", "脊髄虚血"],
      selectedEvidence: [evidence],
    });

    expect(result.supportingSpans?.[0]?.text).toContain("脊髄血流を保つ配慮");
    expect(result.supportingSpans?.[0]?.text).toContain("第 7 章 大動脈手術に伴う諸問題");
    expect(result.supportingSpans?.[0]?.text).not.toContain("分類 3 表 3");
  });

  it("prefers the real JCS spinal-protection page over an Adamkiewicz anatomy/table page for prevention questions", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText: [
        "[章/節: 第 7 章 大動脈手術に伴う諸問題 ASCP/ SCP 596) RCP 598) IIb] -- 127 of 225 -- 128 anterior radicular artery 1463) radiculomedullary artery 6 8 1462, 1463) T4 Adamkiewicz 1462, 1464) critical zone1462, 1464) T4 T1 T2 Adamkiewicz 動脈 椎骨動脈 （胸部神経根髄質動脈） 頚部神経根髄質動脈 硬膜外アーケード 外側仙骨動脈",
        "[章/節: 第 7 章 大動脈手術に伴う諸問題] -- 130 of 225 -- 分節動脈盗血の防止と灌流 SCI 1980 1494, 1495) 遠位側大動脈灌流 collateral network concept 脳脊髄液ドレナージ CSFD SCI CSFD collateral network concept",
      ].join(" --- "),
    });

    const result = synthesizeEvidenceBoundQA("対麻痺を防ぐために何に気をつけますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["対麻痺", "脊髄虚血"],
      selectedEvidence: [evidence],
    });

    expect(result.supportingSpans?.[0]?.text).toContain("分節動脈盗血の防止と灌流");
    expect(result.supportingSpans?.[0]?.text).toContain("脳脊髄液ドレナージ");
    expect(result.supportingSpans?.[0]?.text).not.toContain("anterior radicular artery");
  });

  it("turns a selected JCS guideline span into a patient-family friendly answer while keeping the exact span for audit", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText:
        "-- 142 of 225 -- 脊髄虚血や対麻痺を減らすためには、肋間動脈やAdamkiewicz動脈など脊髄血流を保つ配慮が重要である。術後に足が動かしにくい、感覚が弱いなどの症状があれば早く対応する必要がある。",
    });

    const result = synthesizeEvidenceBoundQA("対麻痺を防ぐために何に気をつけますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["対麻痺", "脊髄虚血"],
      selectedEvidence: [evidence],
    });

    expect(result.answer).toContain("足");
    expect(result.answer).toContain("血流");
    expect(result.answer).toContain("担当医");
    expect(result.answer).not.toContain("この資料では");
    expect(result.answer).not.toContain("選択された資料では");
    expect(result.answer).not.toContain("選択済み参考資料では");
    expect(result.answer).not.toContain("関連する記載として「");
    expect(result.answer).not.toContain("Adamkiewicz");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.answer).not.toContain("引用箇所");
    expect(result.supportingSpans?.[0]?.text).toContain("Adamkiewicz動脈");
  });

  it("answers Marfan/genetic guideline questions with patient-friendly wording and audited JCS span", () => {
    const evidence = createAutoPhysicianUrlEvidence({
      sourceUrl: "https://www.j-circ.or.jp/cms/wp-content/uploads/2020/07/JCS2020_Ogino.pdf",
      fileName: "JCS2020_Ogino.pdf",
      extractedText: [
        "-- 25 of 225 -- 遺伝性結合織疾患による大動脈解離 Marfan FBN1 cystic medial necrosis Loeys-Dietz などを認める。",
        "-- 140 of 225 -- 第 8 章 その他の大動脈疾患 Marfan症候群の大動脈基部置換術では、大動脈基部拡大や大動脈径をみて手術適応を検討する。",
      ].join(" --- "),
    });

    const result = synthesizeEvidenceBoundQA("マルファン症候群のような遺伝性疾患がある場合、手術内容は変わりますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["死亡", "脳梗塞"],
      selectedEvidence: [evidence],
    });

    expect(result.answer).toContain("遺伝性");
    expect(result.answer).toContain("大動脈基部");
    expect(result.answer).toContain("手術範囲");
    expect(result.answer).toContain("担当医");
    expect(result.answer).not.toContain("-- 140 of 225 --");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.evidenceReferences).toEqual([evidence.evidenceId]);
    expect(result.supportingSpans?.[0]?.text).toContain("Marfan症候群");
    expect(result.supportingSpans?.[0]?.text).toContain("大動脈基部置換術");
  });
});
