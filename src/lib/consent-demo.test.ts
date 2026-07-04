import { describe, expect, it } from "vitest";
import {
  buildConsentExport,
  buildEvidenceTransparency,
  createPhysicianUploadedEvidence,
  evaluateEvidenceSufficiency,
  filterEvidenceByIds,
  generateExplanationCards,
  getDefaultCase,
  getDefaultFacilityAnswerTemplates,
  getDefaultSelectedEvidenceIds,
  getEvidenceCatalog,
  retrieveMockEvidence,
  resolveEvidenceSelectionForRequest,
  scoreUnderstandingCheck,
  suggestEvidenceCandidates,
  synthesizeEvidenceBoundQA,
  synthesizeEvidenceBoundQAFromSupportingSpans,
} from "./consent-demo";

describe("consent demo utilities", () => {
  it("retrieves PMID-backed mock evidence for acute type A dissection", () => {
    const evidence = retrieveMockEvidence("acute type A aortic dissection emergency surgery");

    expect(evidence.length).toBeGreaterThanOrEqual(2);
    expect(evidence.every((item) => item.pmid && item.citation)).toBe(true);
    expect(evidence[0].sourceType).toMatch(/Facility|Registry|Guideline/);
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

  it("lets the physician choose the only evidence IDs that family explanations and answers may cite", () => {
    const evidence = retrieveMockEvidence("acute type A aortic dissection emergency surgery");
    const selectedIds = ["AAD-001", "FAC-001"];
    const selected = filterEvidenceByIds(evidence, selectedIds);
    const transparency = buildEvidenceTransparency(selected);

    expect(getDefaultSelectedEvidenceIds()).toEqual(expect.arrayContaining(["AAD-001", "FAC-001"]));
    expect(selected.map((item) => item.evidenceId)).toEqual(selectedIds);
    expect(transparency.sourcePolicy).toContain("医師が選択した文献のみ");
    expect(transparency.lineage.map((item) => item.evidenceId)).toEqual(selectedIds);
  });

  it("suggests MedEvidence-backed candidate references from diagnosis, surgery, and risks before physician selection", () => {
    const evidence = retrieveMockEvidence("Stanford A型急性大動脈解離");
    const result = suggestEvidenceCandidates({
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      evidence,
    });

    expect(result.mode).toBe("medevidence-ai-candidate-suggestion");
    expect(result.sourcePolicy).toContain("医師が最終選択");
    expect(result.suggestedEvidence.map((item) => item.evidenceId)).toEqual(["FAC-001", "AAD-001", "AAD-002", "AAD-003", "AAD-004", "AAD-005"]);
    expect(result.suggestedEvidence.every((item) => item.origin === "facility-document" || item.origin === "medevidence-rag")).toBe(true);
    expect(result.rationaleByEvidenceId["AAD-002"]).toContain("脳梗塞");
    expect(result.searchTrace.length).toBeGreaterThanOrEqual(3);
  });

  it("uses diverse real PubMed-sourced references with physician summaries and fact-check links", () => {
    const pubmedEvidence = getEvidenceCatalog().filter((item) => item.origin === "medevidence-rag");
    const outcomeTags = new Set(pubmedEvidence.flatMap((item) => item.outcomeTags ?? []));

    expect(pubmedEvidence.map((item) => item.pmid)).toEqual(["36322642", "35331557", "36001309", "36237909", "34125453"]);
    expect(pubmedEvidence.every((item) => item.citation.includes("PMID:"))).toBe(true);
    expect(pubmedEvidence.every((item) => item.sourceUrl?.startsWith("https://pubmed.ncbi.nlm.nih.gov/"))).toBe(true);
    expect(pubmedEvidence.every((item) => item.retrievalStatus === "pubmed-verified")).toBe(true);
    expect(
      pubmedEvidence.every(
        (item) =>
          item.clinicalScope?.includes("ATAAD") ||
          item.clinicalScope?.includes("TAAAD") ||
          item.clinicalScope?.includes("急性A型大動脈解離") ||
          item.clinicalScope?.includes("A型急性大動脈解離"),
      ),
    ).toBe(true);
    expect(pubmedEvidence.every((item) => item.clinicianSummary && item.keyFindings && item.keyFindings.length > 0)).toBe(true);
    expect(Array.from(outcomeTags)).toEqual(
      expect.arrayContaining(["mortality", "stroke", "renal-failure", "bleeding", "neurologic-dysfunction", "spinal-cord-injury", "late-survival"]),
    );
  });

  it("answers the family question directly using only text found in physician-selected reference material", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-002"]);
    const result = synthesizeEvidenceBoundQA("脳梗塞は起こりますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      selectedEvidence: evidence,
    });

    expect(result.answer).not.toMatch(/^参考資料では、/);
    expect(result.answer).not.toContain("PubMed掲載");
    expect(result.answer).toContain("術後脳卒中、透析を要する腎不全、出血による再手術が評価されています");
    expect(result.answer.length).toBeLessThanOrEqual(180);
    expect(result.evidenceReferences).toEqual(["AAD-002"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-002"]);
  });

  it("answers sex-difference questions from the selected sex-based outcomes meta-analysis", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("男女差はあるの？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["死亡", "脳梗塞", "出血", "腎不全", "再手術"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("女性");
    expect(result.answer).toContain("男性");
    expect(result.answer).toContain("出血");
    expect(result.evidenceReferences).toEqual(["AAD-002"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-002"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers what aortic dissection is with a plain disease definition when selected references contain it", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("大動脈解離とはどのような病気ですか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("大動脈の壁");
    expect(result.answer).toContain("内側");
    expect(result.answer).toContain("血液が入り込");
    expect(result.answer).toContain("命に関わる");
    expect(result.answer).not.toContain("緊急手術を行う方針");
    expect(result.evidenceReferences).toEqual(["FAC-001"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["FAC-001"]);
    expect(result.safetyLabel).toBe("general");
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers why emergency surgery is needed with a direct reason, not a generic disease/risk summary", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("なぜすぐに手術が必要なのですか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("破裂");
    expect(result.answer).toContain("心タンポナーデ");
    expect(result.answer).toContain("臓器への血流障害");
    expect(result.answer).toContain("命に関わる危険");
    expect(result.answer).toContain("緊急手術が必要");
    expect(result.answer).not.toContain("出血・脳梗塞・腎障害などの重要なリスクを説明します");
    expect(result.answer).not.toContain("大動脈解離は大動脈の壁の内側に裂け目");
    expect(result.answer.length).toBeLessThanOrEqual(180);
    expect(result.evidenceReferences).toEqual(["FAC-001"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["FAC-001"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("routes survival questions to a warm doctor-review answer instead of a cold no-source message", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("生きて帰れますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["死亡", "破裂"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("患者さんごとの状態");
    expect(result.answer).toContain("担当医");
    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.safetyLabel).toBe("individual-prognosis");
    expect(result.requiresDoctorReview).toBe(true);
  });

  it("answers default stroke risk questions directly instead of returning a disease definition or broad complication summary", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("脳梗塞のリスクについて、もっと教えてください", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("術後脳卒中");
    expect(result.answer).toContain("5%");
    expect(result.answer).toContain("95%信頼区間4〜7%");
    expect(result.answer).toContain("記載されています");
    expect(result.answer).not.toContain("大動脈解離は大動脈の壁");
    expect(result.answer).not.toContain("破裂や心タンポナーデ");
    expect(result.answer).not.toContain("出血・脳梗塞・腎障害などの重要なリスクを説明します");
    expect(result.answer).not.toContain("PubMed掲載");
    expect(result.answer.length).toBeLessThanOrEqual(180);
    expect(result.evidenceReferences).toEqual(["AAD-005"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-005"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers paraplegia risk questions with the selected spinal cord injury percentage source instead of a generic risk summary", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("対麻痺のリスクは？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["脳梗塞", "出血", "腎不全", "対麻痺"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("脊髄障害");
    expect(result.answer).toContain("3%");
    expect(result.answer).toContain("95%信頼区間2〜4%");
    expect(result.answer).toContain("記載されています");
    expect(result.answer).toContain("全弓部置換術とフローズン・エレファント・トランク法");
    expect(result.answer).not.toContain("FET");
    expect(result.answer).not.toContain("95%CI");
    expect(result.answer).not.toContain("推定");
    expect(result.answer).not.toContain("院内死亡7%");
    expect(result.answer).not.toMatch(/^参考資料では、/);
    expect(result.answer).not.toContain("PubMed掲載");
    expect(result.answer).not.toContain("担当医の確認が必要");
    expect(result.answer).not.toContain("大動脈解離は大動脈の壁");
    expect(result.evidenceReferences).toEqual(["AAD-005"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-005"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers dialysis risk questions from physician-selected renal-failure/dialysis evidence instead of saying no source exists", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Risk factors for acute kidney injury after Stanford type A aortic dissection repair surgery: a systematic review and meta-analysis.",
      fileName: "PMID-36036431-renal-failure-dialysis.txt",
      extractedText:
        "Risk factors for acute kidney injury (AKI) after Stanford type A aortic dissection (TAAD) repair are inconsistent in different studies. This meta-analysis systematically analyzed the risk factors so as to early identify the therapeutic targets for preventing AKI. The synthesized incidence and risk factors of AKI and its impact on mortality were calculated. Twenty studies comprising 8223 patients were included. The synthesized incidence of postoperative AKI was 50.7%.",
      clinicianSummary:
        "大動脈解離の透析リスクについて言及している論文に関連するPubMed候補。AKI after TAAD repair, incidence, risk factors, mortality impactを扱う。",
      keyFindings: [
        "The synthesized incidence of postoperative AKI was 50.7%.",
        "Risk factors for acute kidney injury (AKI) after Stanford type A aortic dissection (TAAD) repair are inconsistent in different studies.",
        "The synthesized incidence and risk factors of AKI and its impact on mortality were calculated.",
      ],
      outcomeTags: ["renal-failure", "dialysis"],
    });

    const result = synthesizeEvidenceBoundQA("透析のリスクは？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["腎不全", "透析"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("50.7%");
    expect(result.answer).toContain("急性腎障害（AKI）の発生率");
    expect(result.answer).not.toContain("根拠論文:");
    expect(result.answer).not.toContain("引用箇所:");
    expect(result.answer).not.toContain("The synthesized incidence of postoperative AKI was 50.7%.");
    expect(result.answer).not.toContain("選択された論文では");
    expect(result.answer).not.toContain("この資料では");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.supportingSpans).toEqual([{ evidenceId: uploaded.evidenceId, text: "The synthesized incidence of postoperative AKI was 50.7%." }]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("extracts numeric risk from the physician-selected reference content instead of a hard-coded outcome answer", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "施設別 FET 手術説明資料",
      fileName: "local-fet-risk-note.pdf",
      extractedText:
        "当院の全弓部置換+FET説明資料では、対麻痺は12%（95%CI 8〜16%）として説明する。これは施設デモ用の選択済み参考資料である。",
      keyFindings: ["当院の全弓部置換+FET説明資料では、対麻痺は12%（95%CI 8〜16%）として説明する。"],
      outcomeTags: ["spinal-cord-injury"],
    });
    const defaultFetEvidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-005"]);

    const result = synthesizeEvidenceBoundQA("この施設資料では対麻痺のリスクは何%？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["対麻痺"],
      selectedEvidence: [uploaded, ...defaultFetEvidence],
    });

    expect(result.answer).toContain("12%（95%信頼区間8〜16%）");
    expect(result.answer).not.toContain("3%（95%信頼区間2〜4%）");
    expect(result.answer).not.toContain("95%CI");
    expect(result.answer).not.toContain("FET");
    expect(result.answer).not.toMatch(/^参考資料では、/);
    expect(result.answer).not.toContain("担当医の確認が必要");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("agentically searches selected documents for long-term prognosis instead of returning no direct answer", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("長期的な予後は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡", "再手術"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toMatch(/遠隔期死亡|長期サーベイランス|再手術|サーベイランス/);
    expect(result.evidenceReferences.length).toBeGreaterThan(0);
    expect(result.retrievedEvidence.length).toBeGreaterThan(0);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers comparative long-term prognosis from the most relevant selected source span rather than the first long-term source", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Generic procedure comparison cohort",
      fileName: "generic-procedure-comparison.pdf",
      extractedText:
        "In this cohort, Procedure A had lower early complications but higher late mortality than Procedure B. Procedure B had more early complications but lower late mortality.",
      keyFindings: [
        "In this cohort, Procedure A had lower early complications but higher late mortality than Procedure B.",
        "Procedure B had more early complications but lower late mortality.",
      ],
      outcomeTags: ["mortality", "late-survival", "procedure-comparison"],
    });

    const result = synthesizeEvidenceBoundQA("Procedure AとProcedure Bの長期予後の差は？", {
      diagnosis: "術式比較",
      plannedSurgery: "Procedure A or Procedure B",
      risks: ["死亡"],
      selectedEvidence: [
        ...filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds()),
        uploaded,
      ],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("Procedure A");
    expect(result.answer).toContain("higher late mortality");
    expect(result.answer).toContain("Procedure B");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers hemiarch versus total arch long-term prognosis from the selected arch meta-analysis", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("ヘミアーチとトータルアーチの長期予後の差は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡", "再手術"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("ヘミアーチ置換");
    expect(result.answer).toContain("早期成績");
    expect(result.answer).toContain("遠隔期死亡率");
    expect(result.answer).toContain("全弓部置換");
    expect(result.evidenceReferences).toEqual(["AAD-004"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-004"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers abbreviated HAR versus TAR prognosis questions from the selected arch meta-analysis", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("HARとTARの予後の差は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡", "再手術"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("ヘミアーチ置換");
    expect(result.answer).toContain("遠隔期死亡率");
    expect(result.answer).toContain("全弓部置換");
    expect(result.evidenceReferences).toEqual(["AAD-004"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-004"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("does not hard-code the hemiarch versus total arch answer when a selected source reports a different comparison", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Updated hemiarch versus total arch comparison",
      fileName: "updated-arch-comparison.pdf",
      extractedText:
        "In this updated cohort, hemiarch replacement had worse early outcomes but a lower late mortality rate than total arch replacement.",
      keyFindings: [
        "In this updated cohort, hemiarch replacement had worse early outcomes but a lower late mortality rate than total arch replacement.",
      ],
      outcomeTags: ["mortality", "late-survival", "procedure-comparison"],
    });

    const result = synthesizeEvidenceBoundQA("HARとTARの予後の差は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "弓部置換術",
      risks: ["死亡", "再手術"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toMatch(/lower late mortality|遠隔期死亡率.*低/);
    expect(result.answer).not.toContain("遠隔期死亡率は全弓部置換より高い");
    expect(result.answer).not.toContain("早期成績は良好");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers an unknown uploaded English paper through generic bilingual concept expansion", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Unknown postoperative recovery cohort",
      fileName: "unknown-recovery-cohort.pdf",
      extractedText:
        "In this cohort, postoperative cognitive dysfunction at discharge was observed in 18% of patients, and delirium was associated with longer ICU stay.",
      keyFindings: [
        "Postoperative cognitive dysfunction at discharge was observed in 18% of patients.",
        "Delirium was associated with longer ICU stay.",
      ],
    });

    const result = synthesizeEvidenceBoundQA("退院時の認知機能の問題は何%？", {
      diagnosis: "術後回復",
      plannedSurgery: "未指定の手術",
      risks: ["認知機能", "せん妄"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).toMatch(/postoperative cognitive dysfunction at discharge/i);
    expect(result.answer).toContain("18%");
    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("uses generic selected-source RAG to answer a Japanese risk question from an English numeric source without a disease-specific mapping", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Mesenteric malperfusion in acute type A aortic dissection",
      fileName: "mesenteric-malperfusion.pdf",
      extractedText:
        "Preoperative malperfusion occurred in 27.7% of cases. Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
      keyFindings: [
        "Preoperative malperfusion occurred in 27.7% of cases.",
        "Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
      ],
      outcomeTags: ["organ-malperfusion"],
    });

    const result = synthesizeEvidenceBoundQA("腸管虚血のリスクは？", {
      diagnosis: "急性A型大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["腸管虚血"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("27.7%");
    expect(result.answer).toContain("死亡リスク上昇と関連");
    expect(result.answer).not.toContain("OR 1.82");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.answer).not.toContain("引用箇所");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.supportingSpans?.[0]?.text).toContain("Mesenteric malperfusion");
  });

  it("rewrites English PubMed bowel malperfusion spans into family-friendly Japanese without raw paper quotes", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Risk factors and outcomes of mesenteric malperfusion in acute type A aortic dissection",
      fileName: "PMID-39076744-mmp.txt",
      extractedText:
        "A total of 352 patients, mean age: 58.4 ± 11.9 years, diagnosed with aTAAD complicated with MMP were included with an overall prevalence of 4%. The overall in-hospital mortality amongst these patients was 43.5%, and bowel necrosis and/or multiorgan failure were the major causes of death.",
      keyFindings: [
        "A total of 352 patients, mean age: 58.4 ± 11.9 years, diagnosed with aTAAD complicated with MMP were included with an overall prevalence of 4%.",
        "The overall in-hospital mortality amongst these patients was 43.5%, and bowel necrosis and/or multiorgan failure were the major causes of death.",
      ],
      outcomeTags: ["organ-malperfusion", "mortality"],
    });

    const result = synthesizeEvidenceBoundQA("腸管虚血のリスクは？", {
      diagnosis: "急性A型大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["腸管虚血"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).toContain("腸間膜の血流障害を伴う頻度は4%");
    expect(result.answer).toContain("入院中に亡くなった方は43.5%");
    expect(result.answer).toContain("腸管壊死や多臓器不全");
    expect(result.answer).not.toContain("The overall in-hospital mortality");
    expect(result.answer).not.toContain("A total of 352");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
  });

  it("accepts a source-grounded patient-friendly Gemini answer when every numeric claim is supported by verified selected-source spans", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Mesenteric malperfusion in acute type A aortic dissection",
      fileName: "mesenteric-malperfusion.pdf",
      extractedText:
        "Preoperative malperfusion occurred in 27.7% of cases. Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
      keyFindings: [
        "Preoperative malperfusion occurred in 27.7% of cases.",
        "Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
      ],
      outcomeTags: ["organ-malperfusion"],
    });

    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      "腸管虚血のリスクは？",
      {
        diagnosis: "急性A型大動脈解離",
        plannedSurgery: "緊急上行大動脈人工血管置換術",
        risks: ["腸管虚血"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      {
        answerable: true,
        confidence: "moderate",
        reason: "The selected source directly reports malperfusion prevalence and mortality association.",
        familyAnswer:
          "選択された論文では、手術前の血流障害は27.7%にみられ、腸間膜の血流障害は死亡リスク上昇と関連していました（OR 1.82、95%信頼区間1.45-2.28）。",
        supportingSpans: [
          { evidenceId: uploaded.evidenceId, chunkId: "chunk-1", span: "Preoperative malperfusion occurred in 27.7% of cases." },
          { evidenceId: uploaded.evidenceId, chunkId: "chunk-2", span: "Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28)." },
        ],
      },
    );

    expect(result.answer).toContain("手術前の血流障害は27.7%");
    expect(result.answer).toContain("死亡リスク上昇と関連");
    expect(result.answer).not.toContain("OR 1.82");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.answer).not.toContain("引用箇所");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.extractionMode).toBe("agentic-source-bounded");
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("rejects a patient-friendly Gemini answer when it adds unsupported numeric claims outside verified selected-source spans", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Mesenteric malperfusion in acute type A aortic dissection",
      fileName: "mesenteric-malperfusion.pdf",
      extractedText: "Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
      keyFindings: ["Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28)."],
      outcomeTags: ["organ-malperfusion"],
    });

    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      "腸管虚血のリスクは？",
      {
        diagnosis: "急性A型大動脈解離",
        plannedSurgery: "緊急上行大動脈人工血管置換術",
        risks: ["腸管虚血"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      {
        answerable: true,
        confidence: "moderate",
        reason: "The selected source reports mortality association.",
        familyAnswer: "腸管虚血は30%に起こり、死亡リスクはOR 1.82と報告されています。",
        supportingSpans: [
          { evidenceId: uploaded.evidenceId, chunkId: "chunk-1", span: "Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28)." },
        ],
      },
    );

    expect(result.answer).not.toContain("30%");
    expect(result.answer).toContain("1.82");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("uses generic selected-source RAG to quote non-numeric clinical statements without using model prior knowledge", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Mesenteric malperfusion clinical consequences in acute type A dissection",
      fileName: "mesenteric-malperfusion-consequences.pdf",
      extractedText:
        "Mesenteric malperfusion was associated with persistent metabolic acidosis and the need for bowel resection after acute type A dissection repair. The paper did not evaluate renal replacement therapy.",
      keyFindings: [
        "Mesenteric malperfusion was associated with persistent metabolic acidosis and the need for bowel resection after acute type A dissection repair.",
      ],
      outcomeTags: ["organ-malperfusion"],
    });

    const result = synthesizeEvidenceBoundQA("腸管虚血では何が問題になりますか？", {
      diagnosis: "急性A型大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["腸管虚血"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("persistent metabolic acidosis");
    expect(result.answer).toContain("bowel resection");
    expect(result.answer).not.toContain("renal replacement therapy");
    expect(result.answer).not.toContain("根拠論文");
    expect(result.answer).not.toContain("引用箇所");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.supportingSpans?.[0]?.text).toContain("Mesenteric malperfusion");
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("keeps a safe deterministic fallback for family wording like head fog when selected evidence contains delirium", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Unknown postoperative neurocognitive cohort",
      fileName: "unknown-neurocognitive-cohort.pdf",
      extractedText: "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery.",
      keyFindings: ["Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery."],
      outcomeTags: ["delirium"],
    });

    const result = synthesizeEvidenceBoundQA("術後に頭がぼーっとすることはどれくらいありますか？", {
      diagnosis: "術後回復",
      plannedSurgery: "未指定の手術",
      risks: ["せん妄"],
      selectedEvidence: [uploaded],
      facilityAnswerTemplates: [],
    });

    expect(result.answer).toContain("22%");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("uses source-bounded agentic extraction to answer when dictionary matching would miss the family's wording", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Unknown postoperative neurocognitive cohort",
      fileName: "unknown-neurocognitive-cohort.pdf",
      extractedText:
        "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery. The study did not evaluate pregnancy outcomes.",
      keyFindings: ["Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery."],
    });

    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      "術後に頭がぼーっとすることはどれくらいありますか？",
      {
        diagnosis: "術後回復",
        plannedSurgery: "未指定の手術",
        risks: ["せん妄"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      {
        answerable: true,
        confidence: "moderate",
        reason: "The extracted source span directly reports postoperative delirium frequency.",
        supportingSpans: [
          {
            evidenceId: uploaded.evidenceId,
            span: "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery.",
          },
        ],
      },
    );

    expect(result.answer).toContain("22%");
    expect(result.answer).toMatch(/postoperative delirium/i);
    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual([uploaded.evidenceId]);
    expect(result.supportingSpans?.map((item) => item.text)).toEqual([
      "Postoperative delirium occurred in 22% of patients during the first 48 hours after surgery.",
    ]);
    expect(result.extractionMode).toBe("agentic-source-bounded");
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("does not lead the final agentic answer with title-only supporting spans when a direct comparative span is verified", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Outcomes of Procedure A vs Procedure B",
      fileName: "procedure-comparison.pdf",
      extractedText:
        "Procedure A vs Procedure B meta-analysis. Procedure A had better early outcomes but higher late mortality than Procedure B.",
      keyFindings: [
        "Procedure A vs Procedure B meta-analysis.",
        "Procedure A had better early outcomes but higher late mortality than Procedure B.",
      ],
    });

    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      "Procedure AとProcedure Bの長期予後の差は？",
      {
        diagnosis: "比較デモ",
        plannedSurgery: "Procedure A or B",
        risks: ["死亡"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      {
        answerable: true,
        confidence: "moderate",
        reason: "The second span directly answers the long-term comparative prognosis question.",
        supportingSpans: [
          { evidenceId: uploaded.evidenceId, span: "Procedure A vs Procedure B meta-analysis." },
          { evidenceId: uploaded.evidenceId, span: "Procedure A had better early outcomes but higher late mortality than Procedure B." },
        ],
      },
    );

    expect(result.answer).toContain("higher late mortality");
    expect(result.answer).not.toMatch(/^Procedure A vs Procedure B meta-analysis/);
    expect(result.supportingSpans?.map((item) => item.text)).toEqual([
      "Procedure A had better early outcomes but higher late mortality than Procedure B.",
    ]);
  });

  it("rejects agentic extracted spans that are not present in physician-selected sources", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "Unknown postoperative bleeding cohort",
      fileName: "unknown-bleeding-cohort.pdf",
      extractedText: "Major bleeding occurred in 4% of patients after surgery.",
      keyFindings: ["Major bleeding occurred in 4% of patients after surgery."],
    });

    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      "将来の妊娠への影響は書いてある？",
      {
        diagnosis: "術後管理",
        plannedSurgery: "未指定の手術",
        risks: ["出血"],
        selectedEvidence: [uploaded],
        facilityAnswerTemplates: [],
      },
      {
        answerable: true,
        confidence: "moderate",
        reason: "This span is hallucinated and should be rejected by verification.",
        supportingSpans: [
          {
            evidenceId: uploaded.evidenceId,
            span: "Pregnancy outcomes were not affected by the operation.",
          },
        ],
      },
    );

    expect(result.answer).toContain("選択済み参考資料内には、この質問に直接答えられる記載が見つかりません");
    expect(result.answer).not.toContain("Pregnancy outcomes");
    expect(result.evidenceReferences).toEqual([]);
    expect(result.retrievedEvidence).toEqual([]);
    expect(result.requiresDoctorReview).toBe(true);
  });

  it("answers broad family questions about main complications and probabilities from selected numeric outcome spans", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), getDefaultSelectedEvidenceIds());
    const result = synthesizeEvidenceBoundQA("主な合併症とその確率は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡", "脳梗塞", "出血", "腎不全", "対麻痺"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).not.toContain("直接答えられる記載が見つかりません");
    expect(result.answer).toContain("院内死亡7%");
    expect(result.answer).toContain("術後脳卒中5%");
    expect(result.answer).toContain("脊髄障害は3%");
    expect(result.answer).not.toContain("大動脈解離は大動脈の壁");
    expect(result.evidenceReferences).toEqual(["AAD-005"]);
    expect(result.retrievedEvidence.map((item) => item.evidenceId)).toEqual(["AAD-005"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("answers published mortality-rate questions from selected evidence when the numeric span is present", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-005"]);
    const result = synthesizeEvidenceBoundQA("この参考文献で院内死亡率は何%？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("院内死亡7%（95%信頼区間5〜9%）");
    expect(result.answer).not.toContain("95%CI");
    expect(result.answer).not.toMatch(/^参考資料では、/);
    expect(result.answer).not.toContain("担当医の確認が必要");
    expect(result.evidenceReferences).toEqual(["AAD-005"]);
    expect(result.requiresDoctorReview).toBe(false);
  });


  it("answers expected mortality questions from a facility template before literature retrieval", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-002", "AAD-003", "AAD-004", "AAD-005"]);
    const result = synthesizeEvidenceBoundQA("死亡率は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "緊急上行大動脈人工血管置換術",
      risks: ["死亡"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: getDefaultFacilityAnswerTemplates(),
    });

    expect(result.answer).toContain("死亡率はおおよそ10%前後");
    expect(result.answer).toContain("担当医が補足");
    expect(result.evidenceReferences).toEqual(["FAC-TPL-AAD-MORTALITY"]);
    expect(result.safetyLabel).toBe("facility-template");
    expect(result.requiresDoctorReview).toBe(false);
    expect(result.templateReferences?.[0]?.templateId).toBe("FAC-TPL-AAD-MORTALITY");
    expect(result.retrievedEvidence).toEqual([]);
  });

  it("answers short mortality-rate questions directly from selected numeric evidence when no facility template is enabled", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-005"]);
    const result = synthesizeEvidenceBoundQA("死亡率は？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["死亡"],
      selectedEvidence: evidence,
      facilityAnswerTemplates: [],
    });

    expect(result.answer).toContain("院内死亡7%（95%信頼区間5〜9%）");
    expect(result.evidenceReferences).toEqual(["AAD-005"]);
    expect(result.requiresDoctorReview).toBe(false);
  });

  it("does not infer a percentage when the selected relevant reference lacks a numeric risk span", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "FET 術後合併症説明資料",
      fileName: "fet-complication-note.pdf",
      extractedText: "全弓部置換+FET後の合併症として脊髄障害を説明する。ただし、この資料には発生割合や%は記載していない。",
      keyFindings: ["全弓部置換+FET後の合併症として脊髄障害を説明する。"],
      outcomeTags: ["spinal-cord-injury"],
    });

    const result = synthesizeEvidenceBoundQA("この資料で対麻痺のリスクは何%？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "全弓部置換術 + frozen elephant trunk",
      risks: ["対麻痺"],
      selectedEvidence: [uploaded],
    });

    expect(result.answer).toContain("選択済み参考資料内には、この質問に直接答えられる数値記載が見つかりません");
    expect(result.answer).not.toContain("担当医が追加資料");
    expect(result.answer).not.toContain("患者さんの状態");
    expect(result.answer).not.toContain("3%");
    expect(result.answer).not.toContain("12%");
    expect(result.evidenceReferences).toEqual([]);
    expect(result.retrievedEvidence).toEqual([]);
  });

  it("does not answer from case risks or general knowledge when the selected references do not contain the answer", () => {
    const evidence = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-001"]);
    const result = synthesizeEvidenceBoundQA("脳梗塞は起こりますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞", "出血", "腎不全"],
      selectedEvidence: evidence,
    });

    expect(result.answer).toContain("選択済み参考資料内には、この質問に直接答えられる記載が見つかりません");
    expect(result.answer).not.toContain("担当医が追加資料");
    expect(result.answer).not.toContain("患者さんの状態");
    expect(result.answer).not.toContain("起こり得ます");
    expect(result.evidenceReferences).toEqual([]);
    expect(result.retrievedEvidence).toEqual([]);
    expect(result.requiresDoctorReview).toBe(true);
  });

  it("preserves an explicit empty physician evidence selection instead of falling back to defaults", () => {
    const evidence = retrieveMockEvidence("acute type A aortic dissection");

    const explicitEmpty = resolveEvidenceSelectionForRequest(evidence, []);
    const omittedSelection = resolveEvidenceSelectionForRequest(evidence, undefined);

    expect(explicitEmpty).toEqual([]);
    expect(omittedSelection.map((item) => item.evidenceId)).toEqual(getDefaultSelectedEvidenceIds());
  });

  it("marks FET-only evidence insufficient before family explanation because core disease and emergency-purpose topics are missing", () => {
    const selected = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["AAD-005"]);

    const result = evaluateEvidenceSufficiency(selected);

    expect(result.status).toBe("insufficient");
    expect(result.canStart).toBe(false);
    expect(result.requiresPhysicianOverride).toBe(true);
    expect(result.coveredTopics).toContain("major-complications");
    expect(result.missingTopics).toEqual(expect.arrayContaining(["disease-definition", "emergency-need", "procedure-purpose", "physician-ai-boundary"]));
    expect(result.message).toContain("根拠カバレッジ: 不足あり");
  });

  it("marks facility consent plus FET evidence sufficient for the ATAAD demo path", () => {
    const selected = filterEvidenceByIds(retrieveMockEvidence("acute type A aortic dissection"), ["FAC-001", "AAD-005"]);

    const result = evaluateEvidenceSufficiency(selected);

    expect(result.status).toBe("ready");
    expect(result.canStart).toBe(true);
    expect(result.requiresPhysicianOverride).toBe(false);
    expect(result.coveredTopics).toEqual(expect.arrayContaining(["disease-definition", "emergency-need", "procedure-purpose", "major-complications", "physician-ai-boundary"]));
    expect(result.majorComplicationCategories.length).toBeGreaterThanOrEqual(2);
    expect(result.missingTopics).toEqual([]);
    expect(result.message).toBe("根拠カバレッジ: 説明開始可能");
  });

  it("turns a physician-uploaded PDF or non-PubMed paper into selectable evidence for family Q&A", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "日本循環器学会 急性大動脈解離診療ガイドライン PDF",
      fileName: "jcs-acute-aortic-dissection-guideline.pdf",
      sourceUrl: "https://www.j-circ.or.jp/example-guideline.pdf",
      extractedText:
        "急性A型大動脈解離では緊急手術が推奨される。術後合併症として脳梗塞、出血、腎不全、脊髄障害を説明する。",
      clinicianSummary: "日本の診療ガイドラインPDF。急性A型大動脈解離の緊急手術適応と主要合併症を確認する。",
    });

    expect(uploaded.evidenceId).toMatch(/^UP-/);
    expect(uploaded.origin).toBe("physician-upload");
    expect(uploaded.retrievalStatus).toBe("physician-uploaded");
    expect(uploaded.pmid).toBe("非PubMed/医師アップロード");
    expect(uploaded.sourceUrl).toContain("j-circ");
    expect(uploaded.clinicianSummary).toContain("日本の診療ガイドラインPDF");

    const result = synthesizeEvidenceBoundQA("脳梗塞について説明できますか？", {
      diagnosis: "Stanford A型急性大動脈解離",
      plannedSurgery: "上行大動脈人工血管置換術",
      risks: ["脳梗塞"],
      selectedEvidence: [uploaded],
    });

    expect(result.answer).toContain("脳梗塞、出血、腎不全、脊髄障害");
    expect(result.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(result.retrievedEvidence[0].citation).toContain("jcs-acute-aortic-dissection-guideline.pdf");
  });

  it("redacts MRN and numeric patient identifiers before storing physician-uploaded evidence", () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: "MRN-123456 術前説明メモ",
      fileName: "ID-987654-upload.pdf",
      extractedText:
        "患者 MRN-123456 の当院資料。ID: 987654。全弓部置換+FET後の対麻痺は12%（95%CI 8〜16%）として説明する。",
      clinicianSummary: "MRN: 123456 の家族説明で使用する資料。",
      keyFindings: ["患者ID 987654 の対麻痺は12%（95%CI 8〜16%）"],
      outcomeTags: ["spinal-cord-injury"],
    });
    const serialized = JSON.stringify(uploaded);

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("MRN-123456");
    expect(serialized).not.toContain("MRN: 123456");
    expect(serialized).not.toContain("ID-987654");
    expect(serialized).not.toContain("ID: 987654");
    expect(serialized).not.toContain("123456");
    expect(serialized).not.toContain("987654");
    expect(uploaded.displayForFamily).toContain("対麻痺は12%");
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

  it("redacts patient display text in the FHIR-like export even if the case object carries a real name", () => {
    const demoCase = {
      ...getDefaultCase(),
      patientLabel: "黒田太郎 / Taro Kuroda",
    };
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001", "AAD-005"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check);

    expect(payload.patient.display).toBe("Anonymous demo patient");
    expect(JSON.stringify(payload)).not.toContain("黒田太郎");
    expect(JSON.stringify(payload)).not.toContain("Taro Kuroda");
  });

  it("does not export raw case identifiers when the source case id resembles an MRN", () => {
    const demoCase = {
      ...getDefaultCase(),
      caseId: "MRN-123456",
      patientLabel: "黒田太郎 / Taro Kuroda",
    };
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check);
    const serialized = JSON.stringify(payload.sourceAttachment.data);

    expect(payload.sourceAttachment.data.caseId).toBe("demo-anonymous-case");
    expect(serialized).not.toContain("MRN-123456");
    expect(serialized).not.toContain("123456");
  });

  it("includes physician handoff details, family questions, and cited evidence IDs in the export artifact", () => {
    const demoCase = getDefaultCase();
    const evidence = retrieveMockEvidence(demoCase.diagnosis);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: false,
      alternative: true,
      doctorQuestion: "成功率は何%ですか？",
    });
    const sufficiency = evaluateEvidenceSufficiency(evidence);

    const payload = buildConsentExport(demoCase, evidence, cards, check, {
      summary: {
        understood: ["大動脈解離の病態"],
        notUnderstood: ["緊急性"],
        concerns: ["術後に会話できるか不安"],
        doctorQuestions: ["成功率は何%ですか？"],
      },
      qaLog: [
        {
          question: "成功率は何%ですか？",
          answer: "個別予後は担当医が説明します。",
          safetyLabel: "individual-prognosis",
          evidenceReferences: ["FAC-001"],
        },
      ],
      evidenceSufficiency: sufficiency,
      physicianOverrideUsed: false,
    });

    expect(payload.sourceAttachment.data.physicianHandoff.summary.notUnderstood).toContain("緊急性");
    expect(payload.sourceAttachment.data.physicianHandoff.qaLog[0].evidenceReferences).toEqual(["FAC-001"]);
    expect(payload.sourceAttachment.data.physicianHandoff.evidenceCoverage.status).toBe("ready");
    expect(payload.sourceAttachment.data.physicianHandoff.doctorReviewRequired).toBe(true);
  });

  it("does not export handoff citations that were not physician-selected evidence", () => {
    const demoCase = getDefaultCase();
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check, {
      summary: {
        understood: ["緊急手術の目的"],
        notUnderstood: [],
        concerns: [],
        doctorQuestions: [],
      },
      qaLog: [
        {
          question: "脳卒中の数字も説明できますか？",
          answer: "選択済み根拠にない引用は出力しません。",
          safetyLabel: "evidence-gap",
          evidenceReferences: ["FAC-001", "AAD-005", "UNSELECTED-999"],
        },
      ],
    });

    expect(payload.sourceAttachment.data.evidenceIds).toEqual(["FAC-001"]);
    expect(payload.sourceAttachment.data.physicianHandoff.qaLog[0].evidenceReferences).toEqual(["FAC-001"]);
    expect(JSON.stringify(payload.sourceAttachment.data.physicianHandoff.qaLog)).not.toContain("AAD-005");
    expect(JSON.stringify(payload.sourceAttachment.data.physicianHandoff.qaLog)).not.toContain("UNSELECTED-999");
  });

  it("records an audit trail that the export is physician-curated-only and not a legal consent", () => {
    const demoCase = getDefaultCase();
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001", "AAD-005"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check);

    expect(payload.sourceAttachment.data.auditTrail.evidencePolicy).toBe("physician-curated-only");
    expect(payload.sourceAttachment.data.auditTrail.selectedEvidenceIds).toEqual(["FAC-001", "AAD-005"]);
    expect(payload.sourceAttachment.data.auditTrail.legalConsentStatus).toBe("not-a-signed-consent");
    expect(payload.sourceAttachment.data.auditTrail.phiHandling).toContain("No real PHI/PII");
    expect(JSON.stringify(payload.sourceAttachment.data.auditTrail)).not.toContain(demoCase.patientLabel);
  });

  it("redacts patient identifiers from export limitation text as well as handoff text", () => {
    const demoCase = {
      ...getDefaultCase(),
      patientLabel: "黒田太郎 / Taro Kuroda",
      nonGoals: ["黒田太郎さん / MRN: 123456 の署名済み同意書ではありません"],
    };
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check);
    const serialized = JSON.stringify(payload.sourceAttachment.data.limitations);

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("黒田太郎");
    expect(serialized).not.toContain("Taro Kuroda");
    expect(serialized).not.toContain("123456");
  });

  it("redacts patient identifiers from provision action text in the export artifact", () => {
    const demoCase = {
      ...getDefaultCase(),
      patientLabel: "黒田太郎 / Taro Kuroda",
      caseId: "MRN-123456",
      proposedProcedure: "黒田太郎 / Taro Kuroda MRN-123456 の緊急上行大動脈人工血管置換術",
    };
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check);
    const serialized = JSON.stringify(payload.provision.action);

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("黒田太郎");
    expect(serialized).not.toContain("Taro Kuroda");
    expect(serialized).not.toContain("MRN-123456");
    expect(serialized).not.toContain("MRN-");
    expect(serialized).not.toContain("123456");
  });

  it("redacts patient identifiers from physician handoff free text in the export artifact", () => {
    const demoCase = {
      ...getDefaultCase(),
      patientLabel: "黒田太郎 / Taro Kuroda",
    };
    const evidence = filterEvidenceByIds(retrieveMockEvidence(demoCase.diagnosis), ["FAC-001"]);
    const cards = generateExplanationCards(demoCase, evidence);
    const check = scoreUnderstandingCheck({
      purpose: true,
      emergency: true,
      alternative: true,
      doctorQuestion: "",
    });

    const payload = buildConsentExport(demoCase, evidence, cards, check, {
      summary: {
        understood: ["黒田太郎さんは緊急性を理解"],
        notUnderstood: [],
        concerns: ["Taro Kuroda / MRN: 123456 の家族が術後を心配"],
        doctorQuestions: ["ID 123456 の患者はどのくらい入院しますか？"],
      },
      qaLog: [
        {
          question: "Taro Kurodaさんは助かりますか？",
          answer: "黒田太郎さん個別の予後は担当医が説明します。",
          safetyLabel: "individual-prognosis",
          evidenceReferences: [],
        },
      ],
    });

    const serialized = JSON.stringify(payload.sourceAttachment.data.physicianHandoff);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("黒田太郎");
    expect(serialized).not.toContain("Taro Kuroda");
    expect(serialized).not.toContain("123456");
  });
});
