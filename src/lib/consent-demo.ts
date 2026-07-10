export type SourceType = "Facility" | "Registry" | "Guideline" | "Review" | "Uploaded";

export type DemoCase = {
  caseId: string;
  patientLabel: string;
  age: number;
  diagnosis: string;
  urgency: "emergency";
  proposedProcedure: string;
  scenario: string;
  nonGoals: string[];
};

export type EvidenceCard = {
  evidenceId: string;
  title: string;
  sourceType: SourceType;
  claim: string;
  displayForFamily: string;
  confidence: "high" | "moderate";
  citation: string;
  pmid: string;
  origin?: "facility-document" | "medevidence-rag" | "curated-template" | "physician-upload";
  quotedSpan?: string;
  sourceUrl?: string;
  retrievalStatus?: "pubmed-verified" | "facility-demo-document" | "curated-demo-evidence" | "physician-uploaded";
  documentVersion?: string;
  clinicianSummary?: string;
  keyFindings?: string[];
  outcomeTags?: string[];
  clinicalScope?: string;
  uploadedFileName?: string;
  physicianReviewTier?: "adopt-candidate" | "reference-only" | "exclude-recommended";
  physicianReviewTierLabel?: "採用候補" | "参考止まり" | "除外推奨";
  physicianReviewReason?: string;
};

export type FacilityAnswerTemplate = {
  templateId: string;
  label: string;
  questionPatterns: string[];
  answer: string;
  scope: string;
  doctorBurden: "auto-seeded-review-only" | "physician-edited";
  lastReviewedLabel: string;
};

export type ExplanationCard = {
  id: string;
  title: string;
  audience: "family" | "physician";
  body: string;
  evidenceIds: string[];
  doctorReviewRequired: boolean;
};

export type UnderstandingAnswers = {
  purpose: boolean;
  emergency: boolean;
  alternative: boolean;
  doctorQuestion: string;
};

export type UnderstandingResult = {
  correctCount: number;
  totalCount: number;
  requiresDoctorReview: boolean;
  safetyFlags: string[];
  physicianSummary: string;
};

export type PhysicianHandoffDetails = {
  summary: {
    understood: string[];
    notUnderstood: string[];
    concerns: string[];
    doctorQuestions: string[];
  };
  qaLog: Array<{
    question: string;
    answer: string;
    safetyLabel: string;
    evidenceReferences?: string[];
  }>;
  evidenceSufficiency?: EvidenceSufficiencyResult;
  physicianOverrideUsed?: boolean;
};

export type ConsentExport = {
  resourceType: "Consent";
  status: "draft";
  scope: { coding: Array<{ system: string; code: string; display: string }> };
  category: Array<{ text: string }>;
  patient: { reference: string; display: string };
  dateTime: string;
  policyRule: { text: string };
  provision: {
    type: "permit";
    action: Array<{ text: string }>;
    purpose: Array<{ text: string }>;
  };
  sourceAttachment: {
    title: string;
    contentType: "application/json";
    data: {
      caseId: string;
      explanationCardIds: string[];
      evidenceIds: string[];
      understanding: UnderstandingResult;
      limitations: string[];
      auditTrail: {
        evidencePolicy: "physician-curated-only";
        selectedEvidenceIds: string[];
        legalConsentStatus: "not-a-signed-consent";
        phiHandling: string;
      };
      physicianHandoff: {
        summary: PhysicianHandoffDetails["summary"];
        qaLog: Array<{
          question: string;
          answer: string;
          safetyLabel: string;
          evidenceReferences: string[];
        }>;
        evidenceCoverage: EvidenceSufficiencyResult;
        doctorReviewRequired: boolean;
        physicianOverrideUsed: boolean;
      };
    };
  };
};

const evidenceCards: EvidenceCard[] = [
  {
    evidenceId: "FAC-001",
    title: "施設IC資料: 急性A型大動脈解離 緊急手術説明",
    sourceType: "Facility",
    claim:
      "The facility consent document explains emergency surgery purpose, major complications, and physician-led consent boundaries.",
    displayForFamily:
      "当院の説明資料では、大動脈解離は大動脈の壁の内側に裂け目ができ、壁の中へ血液が入り込む病気です。A型では破裂や心タンポナーデ、臓器への血流障害を防ぐため緊急手術を行う方針と、出血・輸血・脳梗塞・腎障害などの重要なリスクを説明します。",
    confidence: "high",
    citation: "施設IC資料 v2026.05 / FAC-001",
    pmid: "FAC-001",
    origin: "facility-document",
    retrievalStatus: "facility-demo-document",
    documentVersion: "2026.05-demo",
    quotedSpan: "緊急手術の目的、重大合併症、担当医による最終説明",
    clinicalScope: "急性A型大動脈解離 / ATAAD consent demo",
    clinicianSummary: "施設IC資料。緊急手術の目的、重大合併症、医師による最終説明の境界を家族向けに確認するための資料。",
    keyFindings: [
      "大動脈解離は、大動脈の壁の内側に裂け目ができ、壁の中へ血液が入り込む病気です。A型では心臓に近い大動脈に及ぶため、破裂や心タンポナーデ、臓器への血流障害などで命に関わることがあります。",
      "破裂・心タンポナーデ・臓器血流障害の予防目的",
      "手術では出血が多くなる場合があり、輸血や追加の止血処置が必要になる可能性があるため、担当医が個別の状態に合わせて説明します。脳梗塞・腎障害などの重大リスクも確認します。",
    ],
    outcomeTags: ["consent", "disease-definition", "bleeding", "stroke", "renal-failure"],
  },
  {
    evidenceId: "AAD-001",
    title: "2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease",
    sourceType: "Guideline",
    claim:
      "The ACC/AHA guideline covers diagnosis, medical therapy, endovascular and surgical treatment, and acute aortic syndromes.",
    displayForFamily:
      "PubMed掲載のACC/AHA大動脈疾患ガイドラインでは、急性大動脈症候群を含む大動脈疾患について、診断、内科治療、外科治療を扱っています。",
    confidence: "high",
    citation: "Isselbacher EM, et al. Circulation. 2022;146:e334-e482. PMID: 36322642",
    pmid: "36322642",
    origin: "medevidence-rag",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/36322642/",
    retrievalStatus: "pubmed-verified",
    quotedSpan: "diagnosis, medical therapy, endovascular and surgical treatment, and acute aortic syndromes",
    clinicalScope: "急性大動脈症候群を含む大動脈疾患ガイドライン / ATAAD context",
    clinicianSummary: "2022 ACC/AHA大動脈疾患ガイドライン。急性A型大動脈解離そのものの個別outcome論文ではなく、急性大動脈症候群を含む診断・治療方針の基盤資料。",
    keyFindings: ["急性大動脈症候群を対象に含む", "診断、内科治療、血管内治療、外科治療、長期サーベイランスを扱う"],
    outcomeTags: ["guideline", "diagnosis", "treatment-strategy", "surveillance"],
  },
  {
    evidenceId: "AAD-002",
    title: "Sex-based outcomes in surgical repair of acute type A aortic dissection: meta-analysis",
    sourceType: "Review",
    claim:
      "The PubMed abstract compares sex-based postoperative outcomes after surgical repair for acute type A aortic dissection: female sex was not associated with increased short-term mortality, stroke, or dialysis-requiring renal failure, while male sex was associated with greater postoperative bleeding reoperation risk.",
    displayForFamily:
      "PubMed掲載の性差メタ解析では、急性A型大動脈解離の手術後アウトカムについて、女性は短期死亡・術後脳卒中・透析を要する腎不全のリスク増加とは関連せず、男性では術後出血による再手術リスクが高いと報告されています。",
    confidence: "moderate",
    citation: "Carino D, et al. J Thorac Cardiovasc Surg. 2024;167:1382-1395.e7. PMID: 35331557",
    pmid: "35331557",
    origin: "medevidence-rag",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/35331557/",
    retrievalStatus: "pubmed-verified",
    quotedSpan:
      "female sex was not associated with increased risk of short-term mortality, postoperative stroke, or dialysis-requiring renal failure; male sex was associated with greater postoperative bleeding/reoperation risk",
    clinicalScope: "急性A型大動脈解離の外科治療 / ATAAD surgical repair",
    clinicianSummary: "急性A型大動脈解離手術の性差メタ解析。女性は短期死亡・術後脳卒中・透析を要する腎不全の増加とは関連せず、男性では術後出血再手術リスクが高いという性差を説明する根拠。",
    keyFindings: [
      "9研究、女性3,338例・男性5,979例を統合した性差メタ解析",
      "術後脳卒中、透析を要する腎不全、出血による再手術が評価されています",
      "女性は院内/30日死亡、術後脳卒中、透析を要する腎不全のリスク増加とは関連しないと報告",
      "男性では術後出血による再手術リスクが高いと報告",
    ],
    outcomeTags: ["mortality", "stroke", "renal-failure", "bleeding", "sex-difference", "female", "male"],
  },
  {
    evidenceId: "AAD-003",
    title: "Early Mortality in Type A Acute Aortic Dissection: IRAD",
    sourceType: "Registry",
    claim:
      "The IRAD PubMed abstract describes type A acute aortic dissection as having historically cited early mortality of 1% to 2% per hour during the initial 48 hours.",
    displayForFamily:
      "PubMed掲載のIRAD研究では、A型急性大動脈解離は最初の48時間に1時間あたり1〜2%の死亡率として引用されてきた、時間依存性の高い病態と説明されています。",
    confidence: "high",
    citation: "Evangelista A, et al. JAMA Cardiol. 2022;7:1009-1015. PMID: 36001309",
    pmid: "36001309",
    origin: "medevidence-rag",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/36001309/",
    retrievalStatus: "pubmed-verified",
    quotedSpan: "mortality rate of 1% to 2% per hour for type A acute aortic dissection during the initial 48 hours",
    clinicalScope: "A型急性大動脈解離の早期死亡 / TAAAD early mortality",
    clinicianSummary: "IRADレジストリの早期死亡研究。A型急性大動脈解離の時間依存性と、手術/内科治療群の早期死亡を説明する際の根拠。",
    keyFindings: ["初期48時間の早期死亡に焦点", "IRAD 1996-2018のTAAAD患者データを解析"],
    outcomeTags: ["mortality", "time-sensitive", "registry"],
  },
  {
    evidenceId: "AAD-004",
    title: "Outcomes of hemi- vs. total arch replacement in acute type A aortic dissection",
    sourceType: "Review",
    claim:
      "This PubMed-indexed meta-analysis compared hemiarch and total arch replacement, reporting that hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
    displayForFamily:
      "PubMed掲載のメタ解析では、ヘミアーチ置換は全弓部置換より早期成績は良好でしたが、遠隔期死亡率は全弓部置換より高いと報告されています。",
    confidence: "moderate",
    citation: "Yuan X, et al. Front Cardiovasc Med. 2022;9:973949. PMID: 36237909",
    pmid: "36237909",
    origin: "medevidence-rag",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/36237909/",
    retrievalStatus: "pubmed-verified",
    quotedSpan: "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
    clinicalScope: "急性A型大動脈解離の弓部術式比較 / ATAAD arch strategy",
    clinicianSummary: "ヘミアーチ vs 全弓部置換のメタ解析。術式選択時に、ヘミアーチは早期成績が良好だが遠隔期死亡率が高いという長期予後差を説明できる根拠。",
    keyFindings: [
      "23観察研究・4,576例を統合",
      "In this study, hemiarch replacement had better early outcomes but a higher late mortality rate than total arch replacement.",
      "ヘミアーチ置換は早期成績は良好だが、全弓部置換より遠隔期死亡率が高いと報告",
    ],
    outcomeTags: ["mortality", "neurologic-dysfunction", "renal-failure", "bleeding", "late-survival", "pneumonia", "reoperation", "hemiarch", "total-arch", "arch-strategy"],
  },
  {
    evidenceId: "AAD-005",
    title: "Hypothermic circulatory arrest time affects neurological outcomes of frozen elephant trunk for ATAAD",
    sourceType: "Review",
    claim:
      "This systematic review/meta-analysis reports in-hospital mortality, postoperative stroke, spinal cord injury, bleeding, and neurologic outcomes for frozen elephant trunk in ATAAD.",
    displayForFamily:
      "急性A型大動脈解離に対する全弓部置換術とフローズン・エレファント・トランク法で、脊髄障害3%（95%信頼区間2〜4%）、院内死亡7%、術後脳卒中5%と記載されています。",
    confidence: "moderate",
    citation: "Harky A, et al. J Card Surg. 2021;36:3021-3033. PMID: 34125453",
    pmid: "34125453",
    origin: "medevidence-rag",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/34125453/",
    retrievalStatus: "pubmed-verified",
    quotedSpan: "in-hospital mortality 7% (95% CI 5-9), postoperative stroke 5% (95% CI 4-7), and spinal cord injury 3% (95% CI 2-4)",
    clinicalScope: "急性A型大動脈解離のFET/全弓部置換 / ATAAD FET outcomes",
    clinicianSummary: "FET手技の神経アウトカムに関するメタ解析。院内死亡、術後脳卒中、脊髄障害、出血を家族説明・術式説明で確認する根拠。",
    keyFindings: [
      "35研究・3,211例を統合",
      "全弓部置換術とフローズン・エレファント・トランク法のあとの脊髄障害は3%（95%信頼区間2〜4%）と記載されています",
      "院内死亡7%（95%CI 5〜9%）、術後脳卒中5%（95%CI 4〜7%）も評価",
    ],
    outcomeTags: ["mortality", "stroke", "spinal-cord-injury", "bleeding", "neurologic-dysfunction"],
  },
];

const facilityAnswerTemplates: FacilityAnswerTemplate[] = [
  {
    templateId: "FAC-TPL-AAD-MORTALITY",
    label: "当院標準: A型大動脈解離 手術死亡率",
    questionPatterns: ["死亡率", "死亡", "院内死亡", "mortality", "助かる確率"],
    answer:
      "当院の急性A型大動脈解離手術では、死亡率はおおよそ10%前後として説明しています。ただし、年齢、解離の範囲、ショックや臓器血流障害の有無で個別の危険度は変わるため、最終的な見込みは担当医が補足します。",
    scope: "急性A型大動脈解離 / 緊急人工血管置換術の家族説明",
    doctorBurden: "auto-seeded-review-only",
    lastReviewedLabel: "デモ標準値・医師は必要時だけ修正",
  },
];

export function getDefaultFacilityAnswerTemplates(): FacilityAnswerTemplate[] {
  return facilityAnswerTemplates.map((item) => ({ ...item }));
}

export function getDefaultCase(): DemoCase {
  return {
    caseId: "demo-ataad-001",
    patientLabel: "匿名デモ患者",
    age: 67,
    diagnosis: "acute type A aortic dissection",
    urgency: "emergency",
    proposedProcedure: "上行大動脈人工血管置換術 ± 弓部置換",
    scenario:
      "突然の胸背部痛で搬送。造影CTで急性A型大動脈解離を認め、緊急手術説明が必要。",
    nonGoals: [
      "AIは最終同意を取得しない",
      "AIは手術適応を決定しない",
      "AIは個別予後や成功率を断定しない",
    ],
  };
}

export function getDefaultSelectedEvidenceIds(): string[] {
  return ["FAC-001", "AAD-001", "AAD-002", "AAD-003", "AAD-004", "AAD-005"];
}

export function filterEvidenceByIds(
  evidence: EvidenceCard[],
  selectedIds: string[],
): EvidenceCard[] {
  const byId = new Map(evidence.map((item) => [item.evidenceId, item]));
  return selectedIds.map((id) => byId.get(id)).filter(Boolean) as EvidenceCard[];
}

export function resolveEvidenceSelectionForRequest(
  evidence: EvidenceCard[],
  selectedEvidenceIds: unknown,
): EvidenceCard[] {
  const evidenceIds = Array.isArray(selectedEvidenceIds)
    ? selectedEvidenceIds.filter((id): id is string => typeof id === "string")
    : getDefaultSelectedEvidenceIds();
  return filterEvidenceByIds(evidence, evidenceIds);
}

export function getEvidenceCatalog(): EvidenceCard[] {
  return evidenceCards;
}

export function createAutoPhysicianUrlEvidence(input: {
  sourceUrl: string;
  fileName?: string;
  extractedText: string;
}): EvidenceCard {
  const sourceUrl = input.sourceUrl.trim();
  const fileName = input.fileName?.trim() || decodeURIComponent(sourceUrl.split("/").pop() || "source-evidence.pdf");
  const rawText = input.extractedText.replace(/\s+/g, " ").trim();
  const text = rawText || inferKnownSourceSeedText(sourceUrl, fileName);
  const title = inferSourceTitle(fileName, text);
  const familyEvidence = buildFamilyEvidenceSentence(text, title);
  const keyFindings = inferKeyFindings(text);
  const clinicalScope = inferClinicalScope(text, title);

  const sourceGroundedText = [text, familyEvidence]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return createPhysicianUploadedEvidence({
    title,
    fileName,
    sourceUrl,
    extractedText: sourceGroundedText,
    clinicianSummary: `${title}。${clinicalScope}に関する医師採用前のAI自動抽出根拠カードです。`,
    clinicalScope,
    keyFindings,
    outcomeTags: inferOutcomeTags(`${text} ${familyEvidence} ${keyFindings.join(" ")}`),
  });
}

export function createPhysicianUploadedEvidence(input: {
  title: string;
  fileName: string;
  extractedText: string;
  clinicianSummary?: string;
  sourceUrl?: string;
  clinicalScope?: string;
  keyFindings?: string[];
  outcomeTags?: string[];
}): EvidenceCard {
  const normalizedText = redactInlinePatientIdentifiers(input.extractedText.replace(/\s+/g, " ").trim());
  const safeTitle = redactInlinePatientIdentifiers(input.title.trim() || input.fileName.trim() || "医師アップロード資料");
  const safeFileName = redactInlinePatientIdentifiers(input.fileName.trim() || "uploaded-evidence.pdf");
  const fingerprint = Array.from(`${input.fileName.trim() || "uploaded-evidence.pdf"}:${input.title.trim() || "医師アップロード資料"}`)
    .reduce((sum, char) => (sum + char.charCodeAt(0)) % 100000, 0)
    .toString()
    .padStart(5, "0");
  const excerpt = normalizedText.slice(0, 220);
  const cleanedFindings = sanitizeUploadKeyFindings(input.keyFindings?.length ? input.keyFindings.join(" ") : normalizedText || input.clinicianSummary || safeTitle);
  const review = classifyUploadedEvidenceForPhysicianReview(cleanedFindings, normalizedText, safeTitle);
  const summary = redactInlinePatientIdentifiers(
    input.clinicianSummary?.trim() || `${safeTitle}。医師がアップロードし、家族説明で引用可能と確認した資料。${review.tier === "adopt-candidate" && cleanedFindings.length > 0 && cleanedFindings.join(" ") !== normalizedText ? " ノイズ除去後の本文記載を優先しています。" : ""}`,
  );
  const keyFindings = input.keyFindings?.length
    ? input.keyFindings.map(redactInlinePatientIdentifiers)
    : (review.tier === "exclude-recommended" ? [summary] : (cleanedFindings.length ? cleanedFindings : [summary]));

  return {
    evidenceId: `UP-${fingerprint}`,
    title: safeTitle,
    sourceType: "Uploaded",
    claim: normalizedText || summary,
    displayForFamily: keyFindings[0] || excerpt || summary,
    confidence: "moderate",
    citation: `医師アップロード資料: ${safeFileName}`,
    pmid: "非PubMed/医師アップロード",
    origin: "physician-upload",
    retrievalStatus: "physician-uploaded",
    uploadedFileName: safeFileName,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    clinicalScope: redactInlinePatientIdentifiers(input.clinicalScope?.trim() || "医師確認済みアップロード資料 / physician-curated upload"),
    clinicianSummary: summary,
    keyFindings,
    quotedSpan: keyFindings[0] || excerpt || summary,
    outcomeTags: input.outcomeTags?.length ? input.outcomeTags : inferOutcomeTags(normalizedText || summary),
    physicianReviewTier: review.tier,
    physicianReviewTierLabel: review.label,
    physicianReviewReason: review.reason,
  };
}

function sanitizeUploadKeyFindings(text: string): string[] {
  const normalized = redactInlinePatientIdentifiers(text.replace(/\s+/g, " ").trim());
  const firstClinicalIndex = normalized.search(/急性|Stanford|大動脈|手術|死亡|脳|腎|出血|術後|risk|complication/i);
  const clinicalSlice = firstClinicalIndex >= 0 ? normalized.slice(firstClinicalIndex) : normalized;
  const withoutLeadNoise = clinicalSlice
    .replace(/(?:目次|contents|文献|references?|PMID\s*\d+|著者一覧|表\s*\d+|Table\s*\d+)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = withoutLeadNoise
    .split(/[。!?]|\.(?=\s+[A-Z\u3040-\u30ff\u3400-\u9fff]|$)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18)
    .filter((sentence) => !/^(?:目次|contents|references?|文献|著者一覧|表\s*\d+)/i.test(sentence))
    .filter((sentence) => !/(?:PMID\s*\d+|References?|著者一覧)/i.test(sentence));
  return sentences.slice(0, 3).map((sentence) => /[。.!?]$/.test(sentence) ? sentence : `${sentence}。`);
}

function classifyUploadedEvidenceForPhysicianReview(
  keyFindings: string[],
  normalizedText: string,
  safeTitle: string,
): { tier: NonNullable<EvidenceCard["physicianReviewTier"]>; label: NonNullable<EvidenceCard["physicianReviewTierLabel"]>; reason: string } {
  const usableText = keyFindings.join(" ");
  if (!usableText || usableText.length < 18 || !/(大動脈解離|急性|手術|死亡|脳|腎|出血|術後|risk|complication)/i.test(usableText + safeTitle)) {
    return { tier: "exclude-recommended", label: "除外推奨", reason: "本文根拠として使える記載が不足しています。目次・文献・著者一覧などの抽出ノイズは患者説明根拠に使わないでください。" };
  }
  const wasNoisy = /(目次|contents|references?|文献|PMID\s*\d+|著者一覧|表\s*\d+)/i.test(normalizedText);
  return {
    tier: "adopt-candidate",
    label: "採用候補",
    reason: wasNoisy
      ? "目次・文献リストなどのノイズを除き、本文中の患者説明に使える記載を採用候補にしています。"
      : "医師アップロード資料の本文記載を患者説明根拠の採用候補にしています。",
  };
}

function redactInlinePatientIdentifiers(value: string): string {
  return value
    .replace(/\b(?:MRN|ID)\s*[-:：]?\s*\d{3,}\b/gi, "[REDACTED]")
    .replace(/\b\d{6,}\b/g, "[REDACTED]");
}

function inferKnownSourceSeedText(sourceUrl: string, fileName: string): string {
  const normalized = `${sourceUrl} ${fileName}`.toLowerCase();
  if (normalized.includes("jcs2020_ogino") || normalized.includes("j-circ.or.jp")) {
    return "2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン。急性A型大動脈解離では緊急手術を含む迅速な判断と治療が必要。死亡、脳梗塞、腎不全、出血などの重篤な合併症も説明対象となる。";
  }
  return "";
}

function inferSourceTitle(fileName: string, text: string): string {
  if (fileName.toLowerCase().includes("jcs2020_ogino") || text.includes("大動脈瘤") || text.includes("大動脈解離診療ガイドライン")) {
    return "2020年改訂版 大動脈瘤・大動脈解離診療ガイドライン（日本循環器学会）";
  }
  return fileName.replace(/\.(pdf|txt)$/i, "") || "URL取り込み参考資料";
}

function inferClinicalScope(text: string, title: string): string {
  if (text.includes("急性A型") || text.includes("Stanford A") || title.includes("大動脈解離")) {
    return "急性A型大動脈解離 / 医師採用候補URL資料";
  }
  return "医師採用候補URL資料";
}

function buildFamilyEvidenceSentence(text: string, title: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.includes("急性A型") && (normalized.includes("緊急手術") || normalized.includes("迅速"))) {
    return "日本循環器学会のガイドラインでは、急性A型大動脈解離は緊急手術を含む迅速な判断と治療が必要な病態として扱われています。";
  }
  if (normalized.includes("大動脈解離") && normalized.includes("迅速")) {
    return "参考資料では、大動脈解離では専門チームによる迅速な判断と治療が必要とされています。";
  }
  return `${title}から、患者説明に関連する記載をAIが自動抽出しました。${normalized.slice(0, 140)}`;
}

function inferKeyFindings(text: string): string[] {
  const findings: string[] = [];
  if (text.includes("急性A型") && text.includes("緊急手術")) findings.push("急性A型大動脈解離では緊急手術を含む迅速な治療判断が重要。");
  if (text.includes("迅速")) findings.push("診断後は専門チームによる迅速な判断と治療が必要。");
  if (text.includes("脳梗塞") || text.includes("脳卒中")) findings.push("脳梗塞・脳卒中などの神経合併症が説明対象に含まれる。");
  if (text.includes("死亡")) findings.push("死亡を含む重篤なリスク説明の基盤資料として扱える。");
  return findings.length ? findings : [text.slice(0, 180)];
}

function inferOutcomeTags(text: string): string[] {
  const normalized = text.toLowerCase();
  const tags: Array<[string, string[]]> = [
    ["mortality", ["死亡", "mortality", "death"]],
    ["stroke", ["脳梗塞", "脳卒中", "stroke", "麻痺"]],
    ["renal-failure", ["腎不全", "透析", "renal", "dialysis"]],
    ["bleeding", ["出血", "輸血", "bleeding"]],
    ["spinal-cord-injury", ["脊髄", "対麻痺", "spinal"]],
    ["reoperation", ["再手術", "reoperation"]],
    ["cognitive-dysfunction", ["認知機能", "認知", "cognitive", "cognition", "neurocognitive"]],
    ["delirium", ["せん妄", "delirium", "confusion"]],
    ["icu-stay", ["集中治療", "icu", "intensive care"]],
    ["length-of-stay", ["入院期間", "在院", "length of stay", "hospital stay"]],
    ["infection", ["感染", "infection", "sepsis"]],
    ["fertility-pregnancy", ["妊娠", "妊孕", "fertility", "pregnancy", "reproductive"]],
    ["quality-of-life", ["生活の質", "qol", "quality of life", "adl"]],
    ["pain", ["痛み", "疼痛", "pain"]],
    ["readmission", ["再入院", "readmission", "rehospitalization"]],
    ["guideline", ["ガイドライン", "guideline"]],
    ["emergency-surgery", ["緊急手術", "emergency surgery", "迅速"]],
  ];
  const inferred = tags.filter(([, terms]) => terms.some((term) => normalized.includes(term.toLowerCase()))).map(([tag]) => tag);
  return inferred.length ? inferred : ["physician-upload"];
}

export function buildEvidenceTransparency(evidence: EvidenceCard[]) {
  return {
    retrievalMode: "physician-curated-only",
    sourcePolicy: "医師が選択した文献のみを根拠として引用します。家族側でEBM/RAG検索を使いこなす前提にしません。",
    evidenceCount: evidence.length,
    facilityDocumentCount: evidence.filter((item) => item.origin === "facility-document").length,
    medEvidenceCount: evidence.filter((item) => item.origin === "medevidence-rag").length,
    limitations: [
      "AIは選択外の文献を引用しません。",
      "個別予後・成功率・同意判断は担当医が直接補足します。",
    ],
    lineage: evidence.map((item) => ({
      evidenceId: item.evidenceId,
      origin: item.origin ?? "curated-template",
      citation: item.citation,
      verificationStatus: item.origin === "facility-document" ? "facility-demo-document" : "curated-demo-evidence",
    })),
  };
}

export type EvidenceSufficiencyTopic =
  | "disease-definition"
  | "emergency-need"
  | "procedure-purpose"
  | "major-complications"
  | "physician-ai-boundary";

export type EvidenceSufficiencyResult = {
  status: "ready" | "insufficient";
  canStart: boolean;
  requiresPhysicianOverride: boolean;
  coveredTopics: EvidenceSufficiencyTopic[];
  missingTopics: EvidenceSufficiencyTopic[];
  majorComplicationCategories: string[];
  message: string;
};

const REQUIRED_EVIDENCE_TOPICS: EvidenceSufficiencyTopic[] = [
  "disease-definition",
  "emergency-need",
  "procedure-purpose",
  "major-complications",
  "physician-ai-boundary",
];

const MAJOR_COMPLICATION_TAGS = [
  "mortality",
  "stroke",
  "bleeding",
  "renal-failure",
  "spinal-cord-injury",
  "neurologic-dysfunction",
  "reoperation",
];

function evidenceTextForCoverage(evidence: EvidenceCard[]): string {
  return evidence
    .flatMap((item) => [
      item.evidenceId,
      item.title,
      item.claim,
      item.displayForFamily,
      item.quotedSpan,
      item.clinicianSummary,
      item.clinicalScope,
      ...(item.keyFindings ?? []),
      ...(item.outcomeTags ?? []),
      item.origin,
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function evaluateEvidenceSufficiency(evidence: EvidenceCard[]): EvidenceSufficiencyResult {
  const text = evidenceTextForCoverage(evidence);
  const complicationCategories = Array.from(
    new Set(
      evidence.flatMap((item) => item.outcomeTags ?? []).filter((tag) => MAJOR_COMPLICATION_TAGS.includes(tag)),
    ),
  );

  const coveredTopics: EvidenceSufficiencyTopic[] = [];
  if (text.includes("disease-definition") || text.includes("大動脈の壁") || text.includes("裂け目") || text.includes("dissection")) {
    coveredTopics.push("disease-definition");
  }
  if (
    text.includes("破裂") ||
    text.includes("心タンポナーデ") ||
    text.includes("臓器への血流障害") ||
    text.includes("time-sensitive") ||
    text.includes("1% to 2% per hour")
  ) {
    coveredTopics.push("emergency-need");
  }
  if (text.includes("緊急手術の目的") || text.includes("予防目的") || text.includes("手術を行う方針") || text.includes("surgical treatment")) {
    coveredTopics.push("procedure-purpose");
  }
  if (complicationCategories.length >= 2) {
    coveredTopics.push("major-complications");
  }
  if (
    text.includes("consent") ||
    text.includes("医師による最終説明") ||
    text.includes("担当医") ||
    text.includes("aiは最終同意")
  ) {
    coveredTopics.push("physician-ai-boundary");
  }

  const missingTopics = REQUIRED_EVIDENCE_TOPICS.filter((topic) => !coveredTopics.includes(topic));
  const ready = missingTopics.length === 0;

  return {
    status: ready ? "ready" : "insufficient",
    canStart: ready,
    requiresPhysicianOverride: !ready,
    coveredTopics,
    missingTopics,
    majorComplicationCategories: complicationCategories,
    message: ready ? "根拠カバレッジ: 説明開始可能" : `根拠カバレッジ: 不足あり（不足トピック: ${missingTopics.join(" / ")}）`,
  };
}

export function retrieveMockEvidence(query: string): EvidenceCard[] {
  const normalized = query.toLowerCase();
  if (!normalized.includes("dissection") && !normalized.includes("解離")) {
    return evidenceCards.filter((item) => item.evidenceId !== "AAD-003");
  }
  return evidenceCards;
}

export type EvidenceCandidateSuggestion = {
  mode: "medevidence-ai-candidate-suggestion";
  retrievalMode: "medevidence-rag-plus-facility-candidate";
  sourcePolicy: string;
  suggestedEvidence: EvidenceCard[];
  rationaleByEvidenceId: Record<string, string>;
  searchTrace: string[];
};

export function suggestEvidenceCandidates(context: {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
  evidence?: EvidenceCard[];
}): EvidenceCandidateSuggestion {
  const evidence = context.evidence ?? retrieveMockEvidence(context.diagnosis);
  const normalizedContext = [context.diagnosis, context.plannedSurgery, ...context.risks].join(" ").toLowerCase();
  const hasDissection = normalizedContext.includes("dissection") || normalizedContext.includes("解離");
  const hasStrokeRisk = normalizedContext.includes("脳梗塞") || normalizedContext.includes("stroke") || normalizedContext.includes("麻痺");
  const hasBleedingOrOrganRisk = ["出血", "腎不全", "臓器", "血流", "bleeding", "renal", "malperfusion"].some((term) =>
    normalizedContext.includes(term),
  );

  const rationaleByEvidenceId: Record<string, string> = {};
  const priority = ["FAC-001", "AAD-001", "AAD-002", "AAD-003", "AAD-004", "AAD-005"];
  const scored = evidence
    .map((item) => {
      let score = item.origin === "facility-document" ? 40 : 20;
      const reasons: string[] = [];

      if (item.origin === "facility-document") {
        score += 30;
        reasons.push("施設IC資料として、家族説明で必ず医師が確認すべき内容を含みます");
      }
      if (item.sourceType === "Guideline" && hasDissection) {
        score += 28;
        reasons.push("診断名にA型大動脈解離が含まれ、緊急手術の標準方針を支えるため候補にします");
      }
      if (item.evidenceId === "AAD-002" && (hasStrokeRisk || hasBleedingOrOrganRisk)) {
        score += 35;
        reasons.push(`主なリスク（${context.risks.join("、") || "未入力"}）のうち脳梗塞・出血・腎不全などを説明する根拠です`);
      }
      if (item.evidenceId === "AAD-004" && (hasDissection || hasBleedingOrOrganRisk || hasStrokeRisk)) {
        score += 30;
        reasons.push("術式選択に関連する早期死亡・神経障害・腎不全/透析・遠隔期死亡など多様なoutcomeを俯瞰できます");
      }
      if (item.evidenceId === "AAD-005" && (hasStrokeRisk || hasBleedingOrOrganRisk || normalizedContext.includes("弓部") || normalizedContext.includes("arch"))) {
        score += 30;
        reasons.push("全弓部置換やFETで問題になる術後脳卒中・脊髄障害・出血などの神経系outcomeを補足します");
      }
      if (item.sourceType === "Registry" && hasDissection) {
        score += 18;
        reasons.push("疾患の緊急性を補足するMedEvidence候補として提示します");
      }
      if (reasons.length === 0) {
        reasons.push("入力内容との関連は限定的なため、医師確認用の低優先候補です");
      }

      rationaleByEvidenceId[item.evidenceId] = reasons.join("。") + "。";
      return { item, score };
    })
    .filter(({ score }) => score >= 35)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return priority.indexOf(a.item.evidenceId) - priority.indexOf(b.item.evidenceId);
    });

  const byId = new Map(scored.map(({ item }) => [item.evidenceId, item]));
  const suggestedEvidence = priority.map((id) => byId.get(id)).filter(Boolean) as EvidenceCard[];

  return {
    mode: "medevidence-ai-candidate-suggestion",
    retrievalMode: "medevidence-rag-plus-facility-candidate",
    sourcePolicy:
      "MedEvidenceを参考にAIが候補を提示しますが、家族説明に引用できる根拠は医師が最終選択したものだけです。",
    suggestedEvidence,
    rationaleByEvidenceId,
    searchTrace: [
      `診断クエリ: ${context.diagnosis || "未入力"}`,
      `手術クエリ: ${context.plannedSurgery || "未入力"}`,
      `リスククエリ: ${context.risks.length ? context.risks.join(" / ") : "未入力"}`,
      `候補抽出: ${suggestedEvidence.map((item) => item.evidenceId).join(" / ") || "なし"}`,
    ],
  };
}

export type EvidenceBoundQAResult = {
  answer: string;
  safetyLabel: "general" | "doctor-review" | "individual-prognosis" | "consent-guidance" | "facility-template";
  requiresDoctorReview: boolean;
  retrievalMode: "physician-curated-only";
  evidenceReferences: string[];
  retrievedEvidence: EvidenceCard[];
  templateReferences?: FacilityAnswerTemplate[];
  supportingSpans?: Array<{ evidenceId: string; text: string }>;
  extractionMode?: "facility-template" | "agentic-source-bounded" | "deterministic-source-bounded";
  citationVerification?: CitationVerificationReport;
};

export type CitationRejectionReason = "unknown-evidence" | "span-not-found-in-source";

export type CitationVerificationReport = {
  requestedSpanCount: number;
  verifiedSpans: Array<{ evidenceId: string; text: string }>;
  rejectedSpans: Array<{ evidenceId: string; span: string; reason: CitationRejectionReason }>;
};

export type SupportingSpanExtraction = {
  answerable: boolean;
  confidence: "high" | "moderate" | "low";
  reason: string;
  familyAnswer?: string;
  supportingSpans: Array<{ evidenceId: string; span: string; chunkId?: string }>;
  abstainReason?: string;
};

type ConsentQAContext = {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
  selectedEvidence: EvidenceCard[];
  facilityAnswerTemplates?: FacilityAnswerTemplate[];
};

const QUESTION_TERMS: Array<{ terms: string[]; safetyLabel: EvidenceBoundQAResult["safetyLabel"]; requiresDoctorReview: boolean }> = [
  { terms: ["男女差", "性差", "男女", "女性", "男性", "sex-based", "sex difference", "female", "male", "women", "men"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["気管切開", "気切", "人工呼吸", "呼吸器", "tracheostomy", "tracheotomy", "ventilator", "mechanical ventilation"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["死亡率", "死亡", "院内死亡", "mortality", "death"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["対麻痺", "脊髄障害", "脊髄", "spinal cord injury", "sci", "paraplegia"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["脳梗塞", "脳卒中", "stroke", "後遺症"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["出血", "輸血", "bleeding"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["腎", "腎不全", "急性腎障害", "透析", "renal", "renal failure", "kidney", "aki", "dialysis"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["臓器", "血流", "malperfusion"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["手術", "なぜ", "必要", "緊急", "しない", "破裂", "心タンポナーデ"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["長期", "長期的", "予後", "遠隔期", "再手術", "経過", "フォロー", "サーベイランス", "late", "long-term", "surveillance", "follow-up"], safetyLabel: "doctor-review", requiresDoctorReview: true },
  { terms: ["病気", "大動脈解離", "解離", "dissection"], safetyLabel: "general", requiresDoctorReview: false },
];

const GENERIC_MEDICAL_CONCEPT_TERMS: string[][] = [
  ["腸管虚血", "腸管", "腸管灌流", "腸管血流", "mesenteric", "mesenteric malperfusion", "bowel", "bowel ischemia", "ischemia", "intestinal ischemia"],
  ["認知機能", "認知", "もの忘れ", "記憶", "cognitive", "cognition", "cognitive dysfunction", "postoperative cognitive dysfunction", "neurocognitive", "cognitive-dysfunction"],
  ["せん妄", "意識混乱", "混乱", "頭がぼーっと", "ぼーっと", "delirium", "confusion"],
  ["退院", "退院時", "退院後", "discharge", "at discharge", "post-discharge", "after discharge"],
  ["集中治療", "icu", "intensive care", "critical care", "icu-stay"],
  ["入院", "在院", "入院期間", "length of stay", "hospital stay", "hospitalization", "length-of-stay"],
  ["出血", "輸血", "止血", "再開胸", "bleeding", "hemorrhage", "transfusion", "hemostasis"],
  ["感染", "感染症", "infection", "sepsis"],
  ["呼吸", "呼吸不全", "肺", "肺合併症", "人工呼吸", "respiratory", "pulmonary", "ventilation", "oxygen"],
  ["妊娠", "妊孕性", "不妊", "fertility", "pregnancy", "reproductive", "fertility-pregnancy"],
  ["生活の質", "qol", "quality of life", "adl", "日常生活", "quality-of-life"],
  ["痛み", "疼痛", "pain"],
  ["再入院", "readmission", "rehospitalization"],
  ["リハビリ", "リハビリテーション", "早期離床", "離床", "日常生活動作", "rehabilitation", "mobilization", "early mobilization"],
];

function isMortalityRateQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["死亡率", "院内死亡", "死亡", "mortality", "death", "助かる確率"].some((term) => normalized.includes(term.toLowerCase()));
}

function findMatchingFacilityTemplate(question: string, templates: FacilityAnswerTemplate[] = []): FacilityAnswerTemplate | undefined {
  const normalized = question.toLowerCase();
  return templates.find((template) =>
    template.questionPatterns.some((pattern) => normalized.includes(pattern.toLowerCase())),
  );
}

function expandGenericMedicalTerms(question: string): string[] {
  const normalized = question.toLowerCase();
  return GENERIC_MEDICAL_CONCEPT_TERMS
    .filter((group) => group.some((term) => normalized.includes(term.toLowerCase())))
    .flat();
}

function getQuestionTerms(question: string): string[] {
  const normalized = question.toLowerCase();
  const genericTerms = expandGenericMedicalTerms(question);
  if (isBroadComplicationProbabilityQuestion(question)) {
    return Array.from(new Set(["主な合併症", "合併症", "リスク", "確率", "割合", "頻度", "発生率", "outcome", "outcomes", "complication", "complications", "risk", "rate", "incidence", "mortality", "死亡", "院内死亡", "stroke", "脳卒中", "脳梗塞", "spinal cord injury", "脊髄障害", "対麻痺", "renal failure", "腎不全", "dialysis", "透析", "bleeding", "出血", "reoperation", "再手術", ...genericTerms]));
  }
  if (mentionsArchProcedurePair(question) && isComparativeQuestion(question)) {
    return Array.from(new Set(["HAR", "TAR", "ヘミアーチ", "ヘミアーチ置換", "半弓部", "全弓部", "全弓部置換", "トータルアーチ", "hemiarch", "hemi-arch", "hemi arch", "hemiarch replacement", "total arch", "total-arch", "total arch replacement", "arch replacement", "arch strategy", "late mortality", "遠隔期死亡", "遠隔期死亡率", "長期", "予後", "早期成績", "early outcomes", ...genericTerms]));
  }
  if (["男女差", "性差", "男女", "女性", "男性", "sex", "female", "male", "women", "men"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["男女差", "性差", "男女", "女性", "男性", "sex-based", "sex difference", "sex-difference", "female sex", "male sex", "female", "male", "women", "men", "女性", "男性", ...genericTerms]));
  }
  if (["気管切開", "気切", "人工呼吸", "呼吸器", "tracheostomy", "tracheotomy", "ventilator"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["気管切開", "気切", "人工呼吸", "人工呼吸器", "呼吸器", "呼吸管理", "tracheostomy", "tracheotomy", "ventilator", "mechanical ventilation", "prolonged ventilation", ...genericTerms]));
  }
  if (["遺伝", "マルファン", "marfan", "家族歴", "結合組織", "大動脈基部"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["遺伝", "遺伝性", "マルファン", "Marfan", "marfan", "FBN1", "家族歴", "familial", "genetic", "aortopathy", "結合組織", "大動脈基部", "基部", "手術適応", "置換術", "大動脈径", ...genericTerms]));
  }
  if (["対麻痺", "脊髄障害", "脊髄", "spinal", "paraplegia"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["対麻痺", "脊髄障害", "脊髄", "spinal cord injury", "sci", "paraplegia", ...genericTerms]));
  }
  if (["長期", "予後", "遠隔", "経過", "フォロー", "サーベイランス", "再手術", "reoperation", "re-operation", "late", "long-term", "surveillance"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["長期", "長期的", "予後", "遠隔期", "遠隔", "晩期", "再手術", "大動脈再手術", "追加手術", "経過", "フォロー", "サーベイランス", "late mortality", "late", "long-term", "surveillance", "follow-up", "aortic re-operation", "reoperation", "re-operation", "reexploration", "late-survival", ...genericTerms]));
  }
  const matchedGroups = QUESTION_TERMS.filter((group) =>
    group.terms.some((term) => normalized.includes(term.toLowerCase())),
  );
  const matched = [...matchedGroups.flatMap((group) => group.terms), ...genericTerms];
  const fallbackTokens = normalized.split(/[\s、。・？?]+/).filter((term) => term.length >= 2);
  return Array.from(new Set([...(matched.length ? matched : fallbackTokens), ...fallbackTokens]));
}

function findRelevantSelectedEvidence(question: string, selectedEvidence: EvidenceCard[]): EvidenceCard[] {
  const terms = getQuestionTerms(question);
  return selectedEvidence.filter((item) => {
    const sourceText = [
      item.displayForFamily,
      item.claim,
      item.quotedSpan,
      item.title,
      item.clinicianSummary,
      ...(item.keyFindings ?? []),
      ...(item.outcomeTags ?? []),
      item.clinicalScope,
    ].join(" ").toLowerCase();
    return terms.some((term) => sourceText.includes(term.toLowerCase()));
  });
}

function agenticSearchSelectedEvidence(question: string, selectedEvidence: EvidenceCard[]): EvidenceCard[] {
  const terms = getQuestionTerms(question);
  const normalizedQuestion = question.toLowerCase();
  const queryTokens = Array.from(new Set([
    ...terms,
    ...normalizedQuestion.split(/[\s、。・？?]+/).filter((term) => term.length >= 2),
  ])).map((term) => term.toLowerCase());

  const scored = selectedEvidence.map((item, index) => {
    const spans = splitEvidenceSpans(item);
    const searchableText = [
      item.title,
      item.displayForFamily,
      item.claim,
      item.quotedSpan,
      item.clinicianSummary,
      item.clinicalScope,
      ...(item.keyFindings ?? []),
      ...(item.outcomeTags ?? []),
    ].join(" ").toLowerCase();
    const termHits = queryTokens.filter((term) => searchableText.includes(term)).length;
    const spanHits = spans.reduce((count, span) => {
      const normalizedSpan = span.toLowerCase();
      return count + queryTokens.filter((term) => normalizedSpan.includes(term)).length;
    }, 0);
    const sourcePriority = item.origin === "facility-document" || item.origin === "physician-upload" ? 2 : 0;
    const score = termHits * 10 + spanHits * 5 + sourcePriority - index * 0.01;
    return { item, score };
  });

  return scored
    .filter((candidate) => candidate.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((candidate) => candidate.item);
}

function findAnswerableSelectedEvidence(question: string, selectedEvidence: EvidenceCard[]): EvidenceCard[] {
  const directlyRelevant = findRelevantSelectedEvidence(question, selectedEvidence);
  if (directlyRelevant.length > 0) return directlyRelevant;
  return agenticSearchSelectedEvidence(question, selectedEvidence);
}

function isDiseaseDefinitionQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksDefinition = ["とは", "どのような病気", "どんな病気", "何ですか", "what is"].some((term) => normalized.includes(term));
  const asksDissection = ["大動脈解離", "解離", "dissection"].some((term) => normalized.includes(term.toLowerCase()));
  return asksDefinition && asksDissection;
}

function isStrokeRiskQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksStroke = ["脳梗塞", "脳卒中", "stroke"].some((term) => normalized.includes(term.toLowerCase()));
  const asksRisk = ["リスク", "risk", "起こ", "合併症", "何%", "何％", "%", "％", "確率", "割合", "について"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  return asksStroke && asksRisk;
}

function isEmergencySurgeryNeedQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksWhy = ["なぜ", "どうして", "理由", "why"].some((term) => normalized.includes(term.toLowerCase()));
  const asksUrgentTiming = ["すぐ", "今すぐ", "緊急", "至急", "急ぐ", "早く", "必要"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  const asksSurgery = ["手術", "治療", "オペ", "surgery"].some((term) => normalized.includes(term.toLowerCase()));
  return asksWhy && asksUrgentTiming && asksSurgery;
}

function isNoSurgeryConsequenceQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksSurgery = /手術|治療|オペ|surgery|operation/.test(normalized);
  const asksNoSurgery = /しない|しなかった|しなければ|しない場合|受けない|やめる|no surgery|without surgery|untreated/.test(normalized);
  const asksConsequence = /どうなる|なりますか|場合|リスク|危険|結果|consequence|happen|risk/.test(normalized);
  return asksSurgery && asksNoSurgery && asksConsequence;
}

function isReoperationPossibilityQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksReoperation = /再手術|再開胸|追加手術|reoperation|re-operation|reexploration|re-exploration/.test(normalized);
  const asksPossibility = /可能性|リスク|起こ|ありますか|あるの|必要|頻度|確率|割合|risk|possib|need|rate|frequency/.test(normalized);
  return asksReoperation && asksPossibility;
}

function isSexDifferenceQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["男女差", "性差", "男女", "女性", "男性", "sex", "female", "male", "women", "men"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
}

function isTracheostomyQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["気管切開", "気切", "人工呼吸", "人工呼吸器", "呼吸器", "tracheostomy", "tracheotomy", "ventilator", "mechanical ventilation"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
}

function hasTracheostomyEvidence(evidence: EvidenceCard[]): boolean {
  return evidence.some((item) =>
    splitEvidenceSpans(item).some((span) => /気管切開|気切|人工呼吸|人工呼吸器|呼吸器|tracheostomy|tracheotomy|ventilator|mechanical ventilation|prolonged ventilation/i.test(span)),
  );
}

function summarizeSexDifferenceFromEvidence(evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  const source = evidence.find((item) =>
    [
      item.title,
      item.displayForFamily,
      item.claim,
      item.quotedSpan,
      item.clinicianSummary,
      ...(item.keyFindings ?? []),
      ...(item.outcomeTags ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .match(/男女差|性差|sex-based|sex difference|sex-difference|female|male|女性|男性/),
  );

  if (!source) return undefined;

  const sexSpecificFindings = source.keyFindings?.filter((finding) => /女性|男性|性差|男女|female|male|sex/i.test(finding)) ?? [];
  const answer = sexSpecificFindings.length > 0
    ? sexSpecificFindings.map(cleanFamilyAnswerSpan).join("。")
    : cleanFamilyAnswerSpan(source.displayForFamily);
  const normalizedAnswer = answer.endsWith("。") ? answer : `${answer}。`;
  return { answer: normalizedAnswer.length <= 260 ? normalizedAnswer : `${normalizedAnswer.slice(0, 257)}...`, source };
}

function isLongTermPrognosisQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["長期", "長期的", "予後", "遠隔", "経過", "フォロー", "サーベイランス", "再手術", "reoperation", "re-operation", "late", "long-term", "surveillance", "follow-up"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
}

function isComparativeQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["差", "違い", "比較", "どちら", "vs", "versus", "than", "compared"].some((term) => normalized.includes(term.toLowerCase()));
}

function extractQuestionSearchTokens(question: string): string[] {
  const normalized = question.toLowerCase();
  const latinTokens = normalized.match(/[a-z0-9]+/g) ?? [];
  const latinPhrases = normalized.match(/[a-z]+\s*[a-z0-9]+/g) ?? [];
  const japaneseTokens = normalized
    .split(/[\s、。・？?（）()]+/)
    .flatMap((token) => token.split(/(?:は|が|を|に|で|へ|から|まで|として|について|とは|なら|だと|ですか|ますか|れる|する|した|して|と|や|vs)/i))
    .map((token) => token.trim())
    .flatMap((token) => {
      const variants = [token];
      if (token.endsWith("リハ")) variants.push("リハビリ");
      if (token.endsWith("テーション")) variants.push(token.replace(/テーション$/, ""));
      return variants;
    })
    .filter((token) => token.length >= 2 && !/[？?。]/.test(token));

  return Array.from(new Set([...latinPhrases, ...latinTokens, ...japaneseTokens, ...getQuestionTerms(question)].filter((token) => token.length >= 2)));
}

function scoreSpanForQuestion(question: string, span: string, sourcePriority = 0): number {
  const normalizedSpan = span.toLowerCase();
  const tokens = extractQuestionSearchTokens(question);
  const directHits = tokens.filter((token) => normalizedSpan.includes(token.toLowerCase())).length;
  const comparisonBoost = isComparativeQuestion(question) && /差|違い|比較|高|低|良好|不良|higher|lower|better|worse|more|less|than|compared/i.test(span) ? 40 : 0;
  const longTermBoost = isLongTermPrognosisQuestion(question) && /長期|遠隔|晩期|予後|サーベイランス|late|long-term|survival|mortality|reoperation/i.test(span) ? 30 : 0;
  const numericBoost = containsNumericRisk(span) ? 10 : 0;
  return directHits * 12 + comparisonBoost + longTermBoost + numericBoost + sourcePriority;
}

function summarizeMostRelevantSourceSpan(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  const candidates = evidence.flatMap((item, evidenceIndex) => {
    const sourcePriority = item.origin === "facility-document" || item.origin === "physician-upload" ? 10 : 0;
    return splitEvidenceSpans(item).map((span, spanIndex) => ({
      item,
      span,
      score: scoreSpanForQuestion(question, span, sourcePriority) - evidenceIndex * 0.01 - spanIndex * 0.001,
    }));
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 45) return undefined;

  const answer = cleanFamilyAnswerSpan(best.span);
  return { answer: answer.length <= 260 ? answer : `${answer.slice(0, 257)}...`, source: best.item };
}

function mentionsArchProcedurePair(question: string): boolean {
  const normalized = question.toLowerCase();
  const mentionsHemiarch = ["ヘミアーチ", "半弓部", "hemiarch", "hemi-arch", "har"].some((term) => normalized.includes(term.toLowerCase()));
  const mentionsTotalArch = ["トータルアーチ", "全弓部", "total arch", "total-arch", "tar"].some((term) => normalized.includes(term.toLowerCase()));
  return mentionsHemiarch && mentionsTotalArch;
}

function translateCommonMedicalTerm(value: string): string {
  return value
    .replace(/mesenteric malperfusion|\bMMP\b/gi, "腸間膜の血流障害")
    .replace(/bowel necrosis/gi, "腸管壊死")
    .replace(/multiorgan failure/gi, "多臓器不全")
    .replace(/in-hospital mortality/gi, "入院中の死亡")
    .replace(/postoperative AKI/gi, "術後の急性腎障害（AKI）")
    .replace(/acute kidney injury\s*\(AKI\)/gi, "急性腎障害（AKI）")
    .replace(/preoperative malperfusion/gi, "手術前の血流障害")
    .replace(/hemiarch replacement/gi, "ヘミアーチ置換")
    .replace(/total arch replacement/gi, "全弓部置換")
    .replace(/hemiarch/gi, "ヘミアーチ")
    .replace(/total arch/gi, "全弓部")
    .replace(/\s+/g, " ")
    .trim();
}

function rewriteCommonComparativeOutcomeSentence(span: string): string | undefined {
  const normalized = span.replace(/\s+/g, " ").trim();
  const match = normalized.match(
    /^(?:in this (?:study|cohort|updated cohort|meta-analysis|systematic review),\s*)?(.+?)\s+had\s+(better|worse)\s+early outcomes\s+but\s+a\s+(higher|lower)\s+late mortality rate\s+than\s+(.+?)\.?$/i,
  );
  if (!match) return undefined;

  const [, rawSubject, earlyDirection, lateDirection, rawComparator] = match;
  const subject = translateCommonMedicalTerm(rawSubject);
  const comparator = translateCommonMedicalTerm(rawComparator);
  const earlyPhrase = earlyDirection.toLowerCase() === "better" ? "早期成績は良好" : "早期成績は不良";
  const latePhrase = lateDirection.toLowerCase() === "higher" ? "高い" : "低い";
  return `この研究では、${subject}は${comparator}より${earlyPhrase}でしたが、遠隔期死亡率は${comparator}より${latePhrase}と報告されています。`;
}

function summarizeLongTermPrognosisFromEvidence(evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  const candidates = evidence.flatMap((item) =>
    splitEvidenceSpans(item).map((span) => ({ item, span, normalizedSpan: span.toLowerCase() })),
  );
  const best = candidates.find((candidate) =>
    ["遠隔期死亡", "late mortality", "長期サーベイランス", "サーベイランス", "再手術", "aortic re-operation", "reoperation", "late-survival"].some((term) =>
      candidate.normalizedSpan.includes(term.toLowerCase()),
    ),
  );
  if (!best) return undefined;

  const answer = cleanFamilyAnswerSpan(best.span);
  return { answer: answer.length <= 220 ? answer : `${answer.slice(0, 217)}...`, source: best.item };
}


function makeFamilyFriendlyMedicalText(span: string): string {
  const comparativeRewrite = rewriteCommonComparativeOutcomeSentence(span);
  if (comparativeRewrite) return comparativeRewrite;

  const normalized = span.replace(/\s+/g, " ").trim();
  const postoperativeAkiMatch = normalized.match(/^The synthesized incidence of postoperative AKI was (\d+(?:\.\d+)?\s*[％%])\.?$/i);
  if (postoperativeAkiMatch) {
    return `大動脈解離術後の急性腎障害（AKI）の発生率は${postoperativeAkiMatch[1].replace("％", "%")}と報告されています。透析そのものの発生率ではなく、透析につながり得る術後腎合併症の数値として説明します。`;
  }

  const mmpPrevalenceMatch = normalized.match(/\b(?:aTAAD|acute type A aortic dissection)[^.]*\b(?:MMP|mesenteric malperfusion)[^.]*overall prevalence of\s+(\d+(?:\.\d+)?\s*[％%])\.?$/i);
  if (mmpPrevalenceMatch) {
    return `急性A型大動脈解離に腸間膜の血流障害を伴う頻度は${mmpPrevalenceMatch[1].replace("％", "%")}と報告されています。`;
  }

  const inHospitalMortalityMatch = normalized.match(/^The overall in-hospital mortality amongst these patients was\s+(\d+(?:\.\d+)?\s*[％%]),\s+and\s+bowel necrosis and\/or multiorgan failure were the major causes of death\.?$/i);
  if (inHospitalMortalityMatch) {
    return `入院中に亡くなった方は${inHospitalMortalityMatch[1].replace("％", "%")}と報告されています。主な原因として腸管壊死や多臓器不全が挙げられています。`;
  }

  const translated = translateCommonMedicalTerm(span);
  const preoperativeOccurrenceMatch = translated.match(/^手術前の血流障害\s+occurred in\s+(\d+(?:\.\d+)?\s*[％%])\s+of cases\.?$/i);
  if (preoperativeOccurrenceMatch) {
    return `手術前の血流障害は${preoperativeOccurrenceMatch[1].replace("％", "%")}にみられたと報告されています。`;
  }

  const associatedMortalityMatch = translated.match(/^(.+?)\s+was associated with mortality\s*\((?:odds ratio|OR),?\s*([^;)]+)(?:;\s*95%\s*CI,?\s*([^)]+))?\)\.?$/i);
  if (associatedMortalityMatch) {
    const [, subject, oddsRatio] = associatedMortalityMatch;
    return `${subject}は死亡リスク上昇と関連していました（関連の強さを示す数値: ${oddsRatio.trim()}）。`;
  }

  return translated
    .replace(/全弓部置換\s*\+\s*FET/g, "全弓部置換術とフローズン・エレファント・トランク法")
    .replace(/FET/g, "フローズン・エレファント・トランク法")
    .replace(/95\s*%\s*CI\s*/gi, "95%信頼区間")
    .replace(/95\s*%\s*信頼区間\s+/g, "95%信頼区間")
    .replace(/後の/g, "のあとの")
    .replace(/と記載。$/g, "と記載されています。")
    .replace(/と記載$/g, "と記載されています")
    .replace(/として説明する。$/g, "として説明されています。")
    .replace(/として説明する$/g, "として説明されています");
}

function cleanFamilyAnswerSpan(span: string): string {
  const cleaned = span
    .replace(/^この資料では、\s*/, "")
    .replace(/^選択された(?:資料|論文|ガイドライン)では、\s*/, "")
    .replace(/^選択済み参考資料では、\s*/, "")
    .replace(/^参考資料では、\s*/, "")
    .replace(/^PubMed掲載の(?:FET)?メタ解析では、\s*/, "")
    .replace(/^PubMed掲載の(?:IRAD)?研究では、\s*/, "")
    .replace(/^PubMed掲載の[^、。]+ガイドラインでは、\s*/, "")
    .replace(/^この(?:PubMed-indexed|systematic review\/meta-analysis|meta-analysis|研究|論文)では、\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return makeFamilyFriendlyMedicalText(cleaned);
}

function summarizeDiseaseDefinitionFromEvidence(evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  const source = evidence.find((item) =>
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .includes("大動脈の壁"),
  );
  const definition = source?.keyFindings?.find((finding) => finding.includes("大動脈の壁"));
  if (!source || !definition) return undefined;

  const answer = cleanFamilyAnswerSpan(definition);
  return { answer: answer.length <= 220 ? answer : `${answer.slice(0, 217)}...`, source };
}

function summarizeEmergencyNeedFromEvidence(evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  const source = evidence.find((item) =>
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .includes("破裂") &&
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .includes("心タンポナーデ"),
  );

  if (!source) return undefined;

  const answer =
    "急性A型大動脈解離では、破裂や心タンポナーデ、臓器への血流障害で命に関わる危険があります。そのため、これらを防ぐ目的で緊急手術が必要です。";
  return { answer, source };
}

function summarizeNoSurgeryConsequenceFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  if (!isNoSurgeryConsequenceQuestion(question)) return undefined;
  const source = evidence.find((item) =>
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .match(/破裂/) &&
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .match(/心タンポナーデ/) &&
    [item.displayForFamily, item.claim, item.quotedSpan, item.clinicianSummary, ...(item.keyFindings ?? [])]
      .join(" ")
      .match(/血流障害|malperfusion/),
  );
  if (!source) return undefined;
  const span = source.keyFindings?.find((finding) => /破裂/.test(finding) && /心タンポナーデ/.test(finding)) ??
    selectBestCitationSpanForQuestion(question, source);
  return {
    answer: "手術しない場合、急性A型大動脈解離では破裂や心タンポナーデ、臓器への血流障害が進み、命に関わる危険があります。患者さんごとの見通しは担当医が現在の状態に合わせて説明します。",
    source,
    span,
  };
}

function summarizeReoperationPossibilityFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  if (!isReoperationPossibilityQuestion(question)) return undefined;
  const candidates = evidence.flatMap((item, evidenceIndex) =>
    splitEvidenceSpans(item).map((span, spanIndex) => {
      const normalizedSpan = span.toLowerCase();
      const reoperationHit = /再手術|再開胸|追加手術|reoperation|re-operation|reexploration|re-exploration/.test(normalizedSpan);
      const riskSignal = /リスク|可能性|評価|報告|高い|必要|risk|reported|evaluated|greater|higher|need/.test(normalizedSpan);
      const bleedingContext = /出血|bleeding|hemorrhage/.test(normalizedSpan);
      const directRiskSignal = /高い|greater|higher|associated|リスクが高|risk/i.test(span) && bleedingContext;
      const sourceBoost = item.origin === "medevidence-rag" || item.retrievalStatus === "pubmed-verified" ? 25 : 0;
      const genericEvaluationPenalty = /評価されています|evaluated/i.test(span) && !directRiskSignal ? 70 : 0;
      const score = (reoperationHit ? 120 : 0) + (riskSignal ? 35 : 0) + (bleedingContext ? 15 : 0) + (directRiskSignal ? 120 : 0) + sourceBoost - genericEvaluationPenalty - evidenceIndex * 0.01 - spanIndex * 0.001;
      return { item, span, score, reoperationHit };
    }),
  );
  const best = candidates
    .filter((candidate) => candidate.reoperationHit && candidate.score >= 120)
    .sort((a, b) => b.score - a.score)[0];
  if (!best) return undefined;
  const answerSpan = cleanFamilyAnswerSpan(best.span);
  const directBleedingReoperationRisk = /男性|male/i.test(answerSpan) && /出血|bleeding/i.test(answerSpan) && /再手術|reoperation/i.test(answerSpan) && /高い|greater|higher/i.test(answerSpan);
  const answer = directBleedingReoperationRisk
    ? "選択された文献では、男性では術後出血による再手術リスクが高いと報告されています。患者さんごとの可能性は、出血リスクや手術中の状況を踏まえて担当医が説明します。"
    : /可能性|リスク/.test(answerSpan)
      ? answerSpan
      : `再手術の可能性については、${answerSpan}`;
  const normalizedAnswer = `${answer}${answer.endsWith("。") ? "" : "。"}`;
  return { answer: normalizedAnswer.length <= 260 ? normalizedAnswer : `${normalizedAnswer.slice(0, 257)}...`, source: best.item, span: best.span };
}

function isRenalDialysisRiskQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksRenal = /透析|腎|腎不全|急性腎障害|aki|renal|kidney|dialysis/.test(normalized);
  const asksRisk = /リスク|risk|起こ|合併症|可能性|危険|問題|困|について|なり|なる|必要|心配|大丈夫|悪く|悪化|因子|原因|防ぐ|予防/.test(normalized);
  return asksRenal && asksRisk;
}

function isRenalRiskFactorQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return /リスク因子|危険因子|因子|原因|なりやす|起こしやす|防ぐ|予防|risk factors?|predictors?|associated/.test(normalized);
}

function isWeakComparatorOnlyFindingForQuestion(question: string, finding: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  const directDialysisQuestion = /透析|dialysis|renal replacement|腎代替療法/.test(normalizedQuestion);
  const sexDifferenceOnly = /女性|男性|男女|性差|female|male|sex/i.test(finding) && /associated|関連|増加|高い|低い|リスク/i.test(finding);
  if (directDialysisQuestion && sexDifferenceOnly && !/\d+(?:\.\d+)?\s*[％%]/.test(finding)) return true;
  return false;
}

function extractRenalRiskFactorFinding(span: string): string | undefined {
  const normalized = span.replace(/\s+/g, " ").trim();
  const sentences = normalized
    .replace(/\s*(Background|Methods|Results|Conclusions):\s*/gi, ". $1: ")
    .replace(/^\.\s*/, "")
    .split(/(?<=[.!?。])\s+|(?=\b(?:Background|Methods|Results|Conclusions):)/i)
    .map((sentence) => sentence.trim().replace(/^\.\s*/, ""))
    .filter((sentence) => sentence.length >= 8);
  return sentences.find((sentence) =>
    /risk factors?|リスク因子|危険因子|associated|関連|predict/i.test(sentence) &&
    /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury|dialysis|透析/i.test(sentence),
  );
}

function extractRenalDialysisNumericFinding(span: string): string | undefined {
  const normalized = span.replace(/\s+/g, " ").trim();
  const sentences = normalized
    .replace(/\s*(Background|Methods|Results|Conclusions):\s*/gi, ". $1: ")
    .replace(/^\.\s*/, "")
    .split(/(?<=[.!?。])\s+|(?=\b(?:Background|Methods|Results|Conclusions):)/i)
    .map((sentence) => sentence.trim().replace(/^\.\s*/, ""))
    .filter((sentence) => sentence.length >= 8);
  const directDialysis = sentences.find((sentence) =>
    /dialysis|透析|renal replacement|腎代替療法/i.test(sentence) && /\d+(?:\.\d+)?\s*[％%]/.test(sentence),
  );
  if (directDialysis) return directDialysis;
  return sentences.find((sentence) =>
    /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury/i.test(sentence) && /\d+(?:\.\d+)?\s*[％%]/.test(sentence),
  );
}

function extractRenalGuidelineFinding(span: string): string | undefined {
  const normalized = span.replace(/\s+/g, " ").trim();
  const directDialysis = normalized.match(/[^。\n]{0,120}(?:透析|dialysis|renal replacement|腎代替療法)[^。\n]{0,220}/i)?.[0]?.trim();
  if (directDialysis) return directDialysis;

  const guidelineFindings = Array.from(normalized.matchAll(/腎機能低下・腎不全患者に対する[^。\n]{0,420}/g))
    .map((match) => match[0]?.trim())
    .filter(Boolean)
    .sort((a, b) => {
      const aToc = /--\s*[1-9]\s+of\s+\d+\s+--/.test(a) || (a.match(/\bPQ\s*\d+/g)?.length ?? 0) >= 2;
      const bToc = /--\s*[1-9]\s+of\s+\d+\s+--/.test(b) || (b.match(/\bPQ\s*\d+/g)?.length ?? 0) >= 2;
      return Number(aToc) - Number(bToc);
    });
  if (guidelineFindings[0]) return guidelineFindings[0];

  const renalIndex = normalized.search(/急性腎障害|\bAKI\b|腎不全|renal failure|kidney injury|\bCKD\b|腎機能低下|CIN|造影/i);
  if (renalIndex < 0) return undefined;
  const start = Math.max(0, renalIndex - 120);
  const end = Math.min(normalized.length, renalIndex + 520);
  return normalized.slice(start, end).trim();
}

function selectBestCitationSpanForQuestion(question: string, source: EvidenceCard): string {
  if (isEmergencySurgeryNeedQuestion(question)) {
    const emergencySpan = source.keyFindings?.find((finding) => /破裂/.test(finding) && /心タンポナーデ/.test(finding));
    if (emergencySpan) return emergencySpan;
  }
  const candidates = splitEvidenceSpans(source);
  if (candidates.length === 0) return source.quotedSpan || source.displayForFamily || source.claim;
  return candidates
    .map((span, index) => ({ span, score: scoreSpanForQuestion(question, span, source.origin === "facility-document" || source.origin === "physician-upload" ? 10 : 0) - index * 0.001 }))
    .sort((a, b) => b.score - a.score)[0]?.span ?? candidates[0];
}

function translateRenalDialysisFindingForFamily(finding: string): string {
  const normalized = finding.replace(/\s+/g, " ").trim();
  const percent = normalized.match(/\d+(?:\.\d+)?\s*[％%]/)?.[0]?.replace("％", "%");
  const isDirectDialysis = /dialysis|透析|renal replacement|腎代替療法/i.test(normalized);
  if (/risk factors?|リスク因子|危険因子|associated|関連|predict/i.test(normalized) && /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury|dialysis|透析/i.test(normalized)) {
    const factors = [
      /age|高齢|年齢/i.test(normalized) ? "高齢" : "",
      /cardiopulmonary bypass|\bCPB\b|人工心肺/i.test(normalized) ? "人工心肺時間" : "",
      /operative time|手術時間/i.test(normalized) ? "手術時間" : "",
      /transfusion|pRBC|輸血/i.test(normalized) ? "輸血量" : "",
      /body mass index|\bBMI\b|肥満/i.test(normalized) ? "BMI高値" : "",
      /preoperative kidney injury|術前腎障害|preoperative renal|術前腎/i.test(normalized) ? "術前腎障害" : "",
    ].filter(Boolean);
    const factorText = factors.length > 0 ? `${factors.join("、")}など` : "手術時間、全身状態、術前の腎機能など";
    return `術後の急性腎障害（AKI）は、${factorText}と関連して報告されています。透析が必要になるかは、術前腎機能、手術経過、術後の尿量や検査値を担当医が確認して説明します。`;
  }
  if (percent && isDirectDialysis) {
    return `大動脈解離術後に透析または腎代替療法が必要になるリスクは${percent}と報告されています。`;
  }
  if (percent && /CIN|contrast|造影|CT/i.test(normalized)) {
    return `腎機能低下・腎不全がある場合、造影CTなどで造影剤腎症（CIN）に注意する必要があり、CINは${percent}と記載されています。透析が必要になるかは、この箇所だけでは断定せず、患者さんの腎機能と治療内容を医師が確認します。`;
  }
  if (percent && /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury/i.test(normalized)) {
    return `急性腎障害（AKI）の発生率または腎不全に関する数値として${percent}が記載されています。透析そのものの発生率ではなく、透析につながり得る腎合併症の数値として医師確認つきで説明します。`;
  }
  if (/dialysis|透析|renal replacement|腎代替療法/i.test(normalized)) {
    return "腎不全が重くなると、透析や集中治療が必要になる場合があります。これは患者さんの腎機能や全身状態によって変わるため、担当医が個別に確認して説明します。";
  }
  if (/急性腎障害|\bAKI\b|腎不全|renal failure|kidney injury|\bCKD\b|腎機能低下|CIN|造影/i.test(normalized)) {
    if (/TEVAR|EVAR|造影|contrast|CIN/i.test(normalized)) {
      return "腎機能低下・腎不全がある場合、TEVAR/EVARや造影CTで急性腎障害（AKI）や造影剤腎症（CIN）に注意が必要です。患者さんごとの腎機能、造影剤使用、術式を医師が確認して説明します。";
    }
    return "腎不全・急性腎障害は、大動脈疾患の治療で注意すべき合併症です。重症度によって治療方針や術後管理に影響するため、患者さんの腎機能を確認しながら医師が説明します。";
  }
  return cleanFamilyAnswerSpan(normalized);
}

function summarizeRenalDialysisRiskFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  if (!isRenalDialysisRiskQuestion(question)) return undefined;
  const asksRiskFactors = isRenalRiskFactorQuestion(question);
  const asksDialysisNeed = /透析|dialysis|renal replacement|腎代替療法/.test(question.toLowerCase());
  const findingDirectlyAnswersRenalQuestion = (finding: string | undefined): boolean => {
    if (!finding) return false;
    if (isWeakComparatorOnlyFindingForQuestion(question, finding)) return false;
    if (asksRiskFactors) return /risk factors?|リスク因子|危険因子|associated|関連|predict|因子|原因/i.test(finding);
    if (!asksDialysisNeed) return /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury|dialysis|透析|renal replacement|腎代替療法/i.test(finding);
    if (/dialysis|透析|renal replacement|腎代替療法/i.test(finding)) {
      return /\d+(?:\.\d+)?\s*[％%]|required|必要|need for|required dialysis|renal replacement|腎代替療法|透析が必要/i.test(finding);
    }
    // For a direct “will dialysis be needed?” question, AKI-only evidence is acceptable only when
    // it contains a concrete rate; sex-difference or generic renal-failure mentions are not a direct answer.
    return /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury/i.test(finding) && /\d+(?:\.\d+)?\s*[％%]/.test(finding);
  };

  const candidates = evidence.flatMap((item, evidenceIndex) => {
    const haystack = [
      item.title,
      item.displayForFamily,
      item.claim,
      item.quotedSpan,
      item.clinicianSummary,
      item.clinicalScope,
      ...(item.keyFindings ?? []),
      ...(item.outcomeTags ?? []),
    ].join(" ").toLowerCase();
    const sourceRiskFactorBoost = asksRiskFactors && /risk factors?|リスク因子|危険因子|associated|関連|predict/.test(haystack) ? 80 : 0;
    const sourceScore =
      (/透析|dialysis/.test(haystack) ? 80 : 0) +
      (/急性腎障害|aki|renal|kidney|腎不全|腎障害/.test(haystack) ? 60 : 0) +
      (/risk factors?|リスク因子|incidence|発生|mortality|死亡/.test(haystack) ? 25 : 0) +
      (item.evidenceId.startsWith("PUBMED-") || item.retrievalStatus === "pubmed-verified" ? 20 : 0) +
      sourceRiskFactorBoost -
      evidenceIndex * 0.01;
    const spans = splitEvidenceSpans(item).map((span, spanIndex) => {
      const numericFinding = extractRenalDialysisNumericFinding(span);
      const riskFactorFinding = extractRenalRiskFactorFinding(span);
      const renalFinding = asksRiskFactors ? (riskFactorFinding ?? numericFinding ?? extractRenalGuidelineFinding(span)) : (numericFinding ?? riskFactorFinding ?? extractRenalGuidelineFinding(span));
      const normalizedSpan = span.toLowerCase();
      const normalizedFinding = renalFinding?.toLowerCase() ?? "";
      const spanScore =
        (/透析|dialysis|renal replacement/.test(normalizedSpan) ? 80 : 0) +
        (/急性腎障害|aki|renal|kidney|腎不全|腎障害/.test(normalizedSpan) ? 60 : 0) +
        (/risk factors?|リスク因子|incidence|発生|mortality|死亡/.test(normalizedSpan) ? 25 : 0) +
        (numericFinding ? 120 : 0) +
        (riskFactorFinding && asksRiskFactors ? 160 : 0) +
        (renalFinding ? 60 : 0) +
        (findingDirectlyAnswersRenalQuestion(renalFinding) ? 200 : 0) +
        (/透析|dialysis|renal replacement/.test(normalizedFinding) ? 40 : 0) -
        ((asksDialysisNeed && !findingDirectlyAnswersRenalQuestion(renalFinding)) ? 260 : 0) -
        ((/--\s*[1-9]\s+of\s+\d+\s+--/.test(span) || (span.match(/\bPQ\s*\d+/g)?.length ?? 0) >= 2) ? 90 : 0) -
        spanIndex * 0.001;
      return { item, span, renalFinding, score: sourceScore + spanScore };
    });
    return spans.length > 0 ? spans : [{ item, span: item.displayForFamily, renalFinding: extractRenalDialysisNumericFinding(item.displayForFamily) ?? extractRenalGuidelineFinding(item.displayForFamily), score: sourceScore }];
  });

  const best = candidates
    .filter((candidate) => findingDirectlyAnswersRenalQuestion(candidate.renalFinding))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 80) return undefined;

  const supportingSpan = best.renalFinding ?? best.span;
  const answer = translateRenalDialysisFindingForFamily(supportingSpan);
  return { answer: answer.length <= 520 ? answer : `${answer.slice(0, 517)}...`, source: best.item, span: supportingSpan };
}

function summarizeStrokeRiskFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  if (!isStrokeRiskQuestion(question)) return undefined;

  const numericStroke = evidence
    .flatMap((item) =>
      splitEvidenceSpans(item).map((span, spanIndex) => ({
        item,
        span,
        spanIndex,
        normalizedSpan: span.toLowerCase(),
      })),
    )
    .filter((candidate) =>
      ["脳卒中", "脳梗塞", "stroke"].some((term) => candidate.normalizedSpan.includes(term.toLowerCase())) &&
      containsNumericRisk(candidate.span),
    )
    .sort((a, b) => a.spanIndex - b.spanIndex)[0];

  if (numericStroke) {
    const strokeNumericSpan =
      numericStroke.span.match(/術後脳卒中\s*\d+(?:\.\d+)?\s*[％%]\s*（95\s*%\s*CI\s*\d+\s*[〜-]\s*\d+\s*[％%]）/i)?.[0] ??
      numericStroke.span.match(/(?:術後)?脳(?:卒中|梗塞)[^、。]*?\d+(?:\.\d+)?\s*[％%][^、。]*/i)?.[0];

    if (strokeNumericSpan) {
      const readableSpan = cleanFamilyAnswerSpan(strokeNumericSpan).replace(/^術後脳卒中/, "術後脳卒中は");
      const answer = isMostlyNonJapaneseText(readableSpan)
        ? answerFromSupportingSpans([{ text: strokeNumericSpan }])
        : `${readableSpan}と記載されています。`;
      return { answer: answer.length <= 180 ? answer : `${answer.slice(0, 177)}...`, source: numericStroke.item };
    }
  }

  const descriptiveSource = evidence.find((item) =>
    splitEvidenceSpans(item).some((span) => ["脳卒中", "脳梗塞", "stroke"].some((term) => span.toLowerCase().includes(term.toLowerCase()))),
  );
  const descriptiveSpan = descriptiveSource
    ? [...(descriptiveSource.keyFindings ?? []), descriptiveSource.displayForFamily, descriptiveSource.quotedSpan, descriptiveSource.claim, descriptiveSource.clinicianSummary]
        .filter((span): span is string => Boolean(span))
        .find((span) => ["脳卒中", "脳梗塞", "stroke"].some((term) => span.toLowerCase().includes(term.toLowerCase())))
    : undefined;

  if (!descriptiveSource || !descriptiveSpan) return undefined;

  const answer = isMostlyNonJapaneseText(cleanFamilyAnswerSpan(descriptiveSpan))
    ? answerFromSupportingSpans([{ text: descriptiveSpan }])
    : cleanFamilyAnswerSpan(descriptiveSpan);
  return { answer: answer.length <= 180 ? answer : `${answer.slice(0, 177)}...`, source: descriptiveSource };
}

function findNearestCitationPrefix(part: string, position: number): string | undefined {
  const contextPattern = /(?:\[章\/節:[^\]]+\]\s*)?--\s*\d+\s+of\s+\d+\s*--(?:\s*\d+)?(?:\s*第\s*\d+\s*章[^。!?？.!?]{0,80})?/g;
  let last: string | undefined;
  for (const match of Array.from(part.matchAll(contextPattern))) {
    const index = match.index ?? 0;
    if (index > position) break;
    last = match[0].replace(/\s+/g, " ").trim();
  }
  return last;
}

function splitEvidencePartIntoSpans(part: string): string[] {
  const spans: string[] = [];
  let sectionCursor = 0;
  for (const rawSection of part.split(/\s+---\s+/)) {
    const sectionIndex = part.indexOf(rawSection, sectionCursor);
    sectionCursor = sectionIndex >= 0 ? sectionIndex + rawSection.length : sectionCursor;
    let sentenceCursor = 0;
    for (const rawSegment of rawSection.split(/(?<=[。!?？])\s*|(?<=[.!?])\s+(?=[A-Z])/)) {
      const localIndex = rawSection.indexOf(rawSegment, sentenceCursor);
      sentenceCursor = localIndex >= 0 ? localIndex + rawSegment.length : sentenceCursor;
      const index = (sectionIndex >= 0 ? sectionIndex : 0) + (localIndex >= 0 ? localIndex : sentenceCursor);
      const sentence = rawSegment.replace(/\s+/g, " ").trim();
      if (sentence.length < 8) continue;
      const prefix = findNearestCitationPrefix(part, index);
      const span = prefix && !sentence.includes(prefix) && !/^--\s*\d+\s+of\s+\d+\s*--/.test(sentence)
        ? `${prefix} ${sentence}`
        : sentence;
      spans.push(span.replace(/\s+/g, " ").trim());
    }
  }
  return spans;
}

function splitEvidenceSpans(item: EvidenceCard): string[] {
  const textParts = [
    ...(item.keyFindings ?? []),
    item.quotedSpan,
    item.displayForFamily,
    item.claim,
    item.clinicianSummary,
  ].filter(Boolean) as string[];

  return textParts
    .flatMap(splitEvidencePartIntoSpans)
    .filter((part, index, parts) => part.length >= 8 && parts.indexOf(part) === index);
}

function isRiskOrProbabilityQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return /リスク|危険|可能性|起こ|どれくらい|どのくらい|頻度|発生|発生率|確率|割合|何%|何％|%|％|risk|probability|frequency|incidence|rate|occur/.test(normalized);
}

function isNumericRiskQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  if (isBroadComplicationProbabilityQuestion(question)) return true;
  if (isMortalityRateQuestion(question)) return true;
  const asksExplicitNumber = ["何%", "何％", "%", "％", "確率", "割合", "rate", "incidence"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  if (asksExplicitNumber) return true;

  const asksRisk = ["リスク", "risk"].some((term) => normalized.includes(term.toLowerCase()));
  const asksSpinalOutcome = ["対麻痺", "脊髄障害", "脊髄", "spinal", "paraplegia"].some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  return asksRisk && asksSpinalOutcome;
}

function containsNumericRisk(span: string): boolean {
  return /\d+(?:\.\d+)?\s*[％%]/.test(span) || /95\s*%?\s*ci/i.test(span) || /95%CI/i.test(span);
}

function isBroadComplicationProbabilityQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const specificOutcome = /死亡率|院内死亡|脳卒中|脳梗塞|脊髄障害|対麻痺|腎不全|透析|出血|再手術|mortality|stroke|spinal|paraplegia|renal|dialysis|bleeding|reoperation/.test(normalized);
  const asksBroadComplications = /合併症|主なリスク|主な危険|主な.*リスク|どんな.*リスク|complications?|adverse events?|outcomes?/.test(normalized);
  const asksProbability = /確率|割合|頻度|何%|何％|どれくらい|どのくらい|発生率|%|％|rate|incidence|probability|frequency/.test(normalized);
  return asksBroadComplications && asksProbability && !specificOutcome;
}

function hasMajorOutcomeSignal(span: string): boolean {
  return /死亡|院内死亡|脳卒中|脳梗塞|脊髄障害|対麻痺|腎不全|透析|出血|再手術|mortality|death|stroke|spinal cord|paraplegia|renal|dialysis|bleeding|reoperation/i.test(span);
}

function extractNumericOutcomeClauses(span: string): string[] {
  const normalized = cleanFamilyAnswerSpan(span);
  const sentence = normalized.endsWith("。") ? normalized.slice(0, -1) : normalized;
  const parts = sentence
    .split(/[、,;]/)
    .map((part) => part.trim().replace(/と記載されています$/g, "").replace(/^脊髄障害(\d)/, "脊髄障害は$1"))
    .filter((part) => containsNumericRisk(part) && hasMajorOutcomeSignal(part));
  return parts.length > 0 ? parts : containsNumericRisk(sentence) && hasMajorOutcomeSignal(sentence) ? [sentence.replace(/と記載されています$/g, "").replace(/^脊髄障害(\d)/, "脊髄障害は$1")] : [];
}

function outcomeCategoryForClause(clause: string): string {
  if (/脊髄障害|対麻痺|spinal cord|paraplegia/i.test(clause)) return "spinal-cord-injury";
  if (/脳卒中|脳梗塞|stroke/i.test(clause)) return "stroke";
  if (/死亡|mortality|death/i.test(clause)) return "mortality";
  if (/腎不全|透析|renal|dialysis/i.test(clause)) return "renal-failure";
  if (/出血|bleeding/i.test(clause)) return "bleeding";
  if (/再手術|reoperation/i.test(clause)) return "reoperation";
  return clause.toLowerCase();
}

function summarizeBroadComplicationRatesFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  if (!isBroadComplicationProbabilityQuestion(question)) return undefined;

  const candidates = evidence.flatMap((item, evidenceIndex) =>
    splitEvidenceSpans(item).flatMap((span, spanIndex) => {
      const outcomeSignals = [
        /死亡|院内死亡|mortality|death/i,
        /脳卒中|脳梗塞|stroke/i,
        /脊髄障害|対麻痺|spinal cord|paraplegia/i,
        /腎不全|透析|renal|dialysis/i,
        /出血|bleeding/i,
        /再手術|reoperation/i,
      ].filter((pattern) => pattern.test(span)).length;
      const proceduralBoost = /術後|院内|手術|全弓部|フローズン|FET|postoperative|in-hospital|procedure|surgery|spinal cord/i.test(span) ? 40 : 0;
      const japaneseOutcomeBoost = /院内死亡|術後脳卒中|脊髄障害|95%信頼区間/.test(span) ? 35 : 0;
      const naturalHistoryPenalty = /1時間あたり|最初の48時間|per hour|initial 48 hours|untreated|未治療/i.test(span) ? 80 : 0;
      return extractNumericOutcomeClauses(span).map((clause, clauseIndex) => ({
        item,
        clause,
        score: 100 + outcomeSignals * 20 + proceduralBoost + japaneseOutcomeBoost + (item.origin === "facility-document" || item.origin === "physician-upload" ? 10 : 0) - naturalHistoryPenalty - evidenceIndex * 0.01 - spanIndex * 0.001 - clauseIndex * 0.0001,
      }));
    }),
  );

  const seenCategories = new Set<string>();
  const selected = candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const category = outcomeCategoryForClause(candidate.clause);
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    })
    .slice(0, 4);

  if (selected.length === 0) return undefined;

  const firstSource = selected[0].item;
  const joined = selected.map((candidate) => candidate.clause).join("、");
  const answer = `${joined}と記載されています。`;
  return { answer: answer.length <= 300 ? answer : `${answer.slice(0, 297)}...`, source: firstSource };
}

function summarizeGenericSourceBoundedRiskFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  if (!isRiskOrProbabilityQuestion(question)) return undefined;
  if (evidence.length !== 1) return undefined;

  const source = evidence[0];
  const seenSpans = new Set<string>();
  const candidateSpans = splitEvidenceSpans(source)
    .map((span, index) => {
      const numeric = containsNumericRisk(span) || /odds ratio|risk ratio|\bOR\b|\bRR\b|confidence interval|95\s*%\s*CI/i.test(span);
      const outcome = /risk|mortality|death|outcome|complication|incidence|prevalence|occurred|associated|odds ratio|risk ratio|malperfusion|ischemia|bowel|MMP|灌流|虚血|腸管|死亡|発生|合併/i.test(span);
      const bowelBoost = /腸管|腸間膜|bowel|mesenteric|MMP|malperfusion|ischemia/i.test(span) ? 25 : 0;
      const score = (numeric ? 100 : 0) + (outcome ? 60 : 0) + bowelBoost - index * 0.01;
      return { span, score };
    })
    .filter((candidate) => candidate.score >= 120)
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const key = candidate.span.toLowerCase().replace(/\s+/g, " ").trim();
      if (seenSpans.has(key)) return false;
      seenSpans.add(key);
      return true;
    })
    .slice(0, 2);

  if (candidateSpans.length === 0) return undefined;

  const joined = candidateSpans.map((candidate) => cleanFamilyAnswerSpan(candidate.span)).join(" ");
  const readable = joined
    .replace(/odds ratio,?\s*/gi, "OR ")
    .replace(/95\s*%\s*CI/gi, "95%信頼区間");
  const answer = isMostlyNonJapaneseText(readable)
    ? answerFromSupportingSpans(candidateSpans.map((candidate) => ({ text: candidate.span })))
    : `${readable}${readable.endsWith("。") ? "" : "。"}`;
  const citationSpan = candidateSpans.map((candidate) => candidate.span).join(" ");
  return {
    answer,
    source,
    span: citationSpan,
  };
}

function isGenericSourceBoundedFallbackQuestion(question: string): boolean {
  return (
    (expandGenericMedicalTerms(question).length > 0 || isRiskOrProbabilityQuestion(question)) &&
    !isNumericRiskQuestion(question) &&
    !isStrokeRiskQuestion(question) &&
    !isRenalDialysisRiskQuestion(question) &&
    !isComparativeQuestion(question) &&
    !isLongTermPrognosisQuestion(question) &&
    !isEmergencySurgeryNeedQuestion(question) &&
    !isDiseaseDefinitionQuestion(question) &&
    !isSexDifferenceQuestion(question)
  );
}

function buildPatientFriendlyUploadedGuidelineAnswer(question: string, span: string): string {
  const normalizedQuestion = question.toLowerCase();
  if (/脊髄|対麻痺|下半身|spinal|paraplegia/i.test(normalizedQuestion)) {
    return "足のまひにつながる脊髄の血流低下を避けるため、手術中から術後まで血流を保つ配慮と早期発見が大切です。足が動かしにくい、感覚が弱いなどの変化があれば、すぐに担当医が確認します。";
  }
  if (/妊娠|出産|妊婦|pregnan/i.test(normalizedQuestion)) {
    return "妊娠中の場合は、お母さんと赤ちゃんの状態をあわせて見ながら、治療方針を個別に判断する必要があります。実際にどの治療を選ぶかは、担当医が今の状態を確認して説明します。";
  }
  if (/腸|腹|腸管|腸間膜|malperfusion|mesenteric|bowel|visceral|ischemia/i.test(normalizedQuestion)) {
    return "腸への血流が悪くなることは重い合併症です。お腹の痛みや血流の状態を見ながら、手術や集中治療で早く対応する必要があるため、担当医が現在の所見に合わせて説明します。";
  }
  if (/出血|輸血|止血|bleed|hemorrhage|transfusion/i.test(normalizedQuestion)) {
    return "手術では出血が多くなる場合があり、輸血や追加の止血処置が必要になる可能性があります。実際の見込みや対応は、担当医が今の状態に合わせて説明します。";
  }
  if (/感染|発熱|創部|infection|sepsis|fever|wound/i.test(normalizedQuestion)) {
    return "手術後には感染症に注意します。発熱、創部の変化、全身状態の変化などを見ながら早く評価し、必要な治療を行うため、担当医が現在の状態に合わせて説明します。";
  }
  if (/呼吸|肺|人工呼吸|酸素|respiratory|pulmonary|ventilat|oxygen/i.test(normalizedQuestion)) {
    return "手術後は肺や呼吸の状態が不安定になることがあり、酸素投与や人工呼吸管理が必要になる場合があります。どの程度注意が必要かは、担当医が全身状態に合わせて説明します。";
  }
  if (/遺伝|マルファン|marfan|家族|大動脈径/i.test(normalizedQuestion)) {
    return "マルファン症候群などの遺伝性の大動脈疾患が関わる場合は、大動脈基部を含めて広がりや大きさを慎重に見て、手術範囲や再手術の必要性を検討します。患者さんに当てはまるか、今回どこまで置き換えるかは担当医が確認して説明します。";
  }
  if (/腎|透析|尿|renal|kidney|aki|dialysis/.test(normalizedQuestion)) {
    return "腎臓の働きが悪くなることは重要な合併症です。必要に応じて透析や集中治療を行うことがあり、患者さんの検査値や尿量を見ながら担当医が説明します。";
  }
  const excerpt = cleanFamilyAnswerSpan(span).replace(/^--\s*\d+\s+of\s+\d+\s+--\s*/, "");
  const clipped = excerpt.length <= 180 ? excerpt : `${excerpt.slice(0, 177)}...`;
  return `${clipped}${clipped.endsWith("。") ? "" : "。"}患者さんごとの意味は、担当医が今の状態に合わせて確認します。`;
}

function summarizeUploadedGuidelineQuestionSpan(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  const candidates = evidence.flatMap((item, evidenceIndex) => {
    if (item.origin !== "physician-upload") return [];
    const sourceLabel = `${item.title} ${item.citation} ${item.uploadedFileName ?? ""} ${item.sourceUrl ?? ""}`;
    const isUploadedGuideline = item.sourceType === "Guideline" || /ガイドライン|guideline|JCS\d{4}|j-circ/i.test(sourceLabel);
    if (!isUploadedGuideline) return [];
    const normalizedQuestion = question.toLowerCase();
    const isSpinalPreventionQuestion = /脊髄|対麻痺|下半身|spinal|paraplegia/i.test(normalizedQuestion) && /防ぐ|予防|気をつけ|avoid|prevent/i.test(normalizedQuestion);
    const tokens = extractQuestionSearchTokens(question).map((token) => token.toLowerCase());
    return splitEvidenceSpans(item).map((span, spanIndex) => {
      const normalizedSpan = span.toLowerCase();
      const directHits = tokens.filter((token) => normalizedSpan.includes(token)).length;
      const specificTokens = tokens.filter((token) => !/^(急性|stanford|大動脈|大動脈解離|解離|治療|方針|手術|資料|記載|ありますか|何|問題|場合|ですか|変わりますか)$/.test(token));
      const directSpecificHits = specificTokens.filter((token) => normalizedSpan.includes(token)).length;
      const spinalConceptHit = isSpinalPreventionQuestion && /脊髄|対麻痺|\bSCI\b|spinal|paraplegia/i.test(span);
      const geneticConceptHit = /遺伝|マルファン|marfan|家族|大動脈径/i.test(normalizedQuestion) && /遺伝|遺伝性|マルファン|marfan|FBN1|家族歴|familial|genetic|aortopathy|結合組織|大動脈基部|基部/i.test(span);
      const preventionSignal = isSpinalPreventionQuestion && /予防|防止|保護|温存|再建|配慮|保つ|灌流|ドレナージ|CSFD|術後|モニタリング/i.test(span);
      const geneticTreatmentSignal = geneticConceptHit && /手術適応|置換術|再手術|大動脈基部|基部|瘤径|大動脈径|mm|VSRR|Bentall|治療|術式|範囲/i.test(span);
      const clinicalSignal = /associated|association|occurred|reported|observed|need for|required|linked|risk|outcome|complication|malperfusion|ischemia|bowel|mesenteric|marfan|aortopathy|\bSCI\b|spinal|paraplegia|rehabilitation|mobilization|bleeding|hemorrhage|transfusion|infection|sepsis|respiratory|pulmonary|ventilation|oxygen|関連|伴|必要|発生|認め|リスク|合併|虚血|腸管|腸間膜|マルファン|遺伝|大動脈瘤|適応|脊髄|対麻痺|脊髄保護|灌流|リハビリ|離床|日常生活動作|出血|輸血|止血|感染|感染症|呼吸不全|人工呼吸|肺合併症/i.test(span);
      const figureOrTocPenalty =
        (/--\s*[1-9]\s+of\s+\d+\s+--/.test(span) ? 18 : 0) +
        ((span.match(/\bPQ\s*\d+/g)?.length ?? 0) >= 2 ? 35 : 0) +
        ((span.match(/\b\d{1,4}\b/g)?.length ?? 0) >= 65 ? 15 : 0);
      const score =
        scoreSpanForQuestion(question, span, 12) +
        directHits * 24 +
        (clinicalSignal ? 18 : 0) +
        (spinalConceptHit ? 90 : 0) +
        (geneticConceptHit ? 90 : 0) +
        (preventionSignal ? 140 : 0) +
        (geneticTreatmentSignal ? 130 : 0) -
        (spinalConceptHit && !preventionSignal && /Adamkiewicz|前脊髄動脈|artery|radicular|椎骨動脈|アーケード/i.test(span) ? 80 : 0) -
        figureOrTocPenalty - evidenceIndex * 0.01 - spanIndex * 0.001;
      return { item, span, directHits, directSpecificHits, spinalConceptHit, geneticConceptHit, preventionSignal, geneticTreatmentSignal, clinicalSignal, score };
    });
  });

  const filteredCandidates = candidates.filter((candidate) => (candidate.directSpecificHits > 0 || candidate.spinalConceptHit || candidate.geneticConceptHit) && candidate.clinicalSignal && candidate.score >= 26);
  const preventionCandidates = filteredCandidates.filter((candidate) => candidate.preventionSignal);
  const geneticTreatmentCandidates = filteredCandidates.filter((candidate) => candidate.geneticTreatmentSignal);
  const best = (preventionCandidates.length > 0 ? preventionCandidates : geneticTreatmentCandidates.length > 0 ? geneticTreatmentCandidates : filteredCandidates)
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return undefined;
  const answer = buildPatientFriendlyUploadedGuidelineAnswer(question, best.span);
  return {
    answer,
    source: best.item,
    span: best.span,
  };
}

function summarizeGenericSourceBoundedStatementFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  const uploadedGuideline = summarizeUploadedGuidelineQuestionSpan(question, evidence);
  if (uploadedGuideline) return uploadedGuideline;
  if (!isGenericSourceBoundedFallbackQuestion(question)) return undefined;
  const candidates = evidence.flatMap((item, evidenceIndex) => {
    const sourcePriority = item.origin === "facility-document" || item.origin === "physician-upload" ? 10 : 0;
    return splitEvidenceSpans(item).map((span, spanIndex) => {
      const clinicalSignal = /associated|association|occurred|reported|observed|need for|required|linked|risk|outcome|complication|malperfusion|ischemia|bowel|mesenteric|resection|acidosis|bleeding|hemorrhage|transfusion|infection|sepsis|respiratory|pulmonary|ventilation|oxygen|rehabilitation|mobilization|関連|伴|必要|発生|認め|リスク|合併|虚血|腸管|切除|出血|輸血|止血|感染|感染症|呼吸不全|人工呼吸|肺合併症|リハビリ|離床|日常生活動作/i.test(span);
      const score = scoreSpanForQuestion(question, span, sourcePriority) + (clinicalSignal ? 18 : 0) - evidenceIndex * 0.01 - spanIndex * 0.001;
      return { item, span, score, clinicalSignal };
    });
  });

  const best = candidates
    .filter((candidate) => candidate.clinicalSignal && candidate.score >= 28)
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return undefined;

  const answerSpan = cleanFamilyAnswerSpan(best.span);
  const answer = `${answerSpan}${answerSpan.endsWith("。") ? "" : "。"}`;
  return { answer: answer.length <= 240 ? answer : `${answer.slice(0, 237)}...`, source: best.item, span: best.span };
}

function summarizeNumericRiskFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard } | undefined {
  if (!isNumericRiskQuestion(question)) return undefined;

  const broadComplications = summarizeBroadComplicationRatesFromEvidence(question, evidence);
  if (broadComplications) return broadComplications;

  const normalizedQuestion = question.toLowerCase();
  const terms = getQuestionTerms(question);
  const exactQuestionTerms = terms.filter((term) => normalizedQuestion.includes(term.toLowerCase()));

  const candidates = evidence.flatMap((item, evidenceIndex) =>
    splitEvidenceSpans(item).map((span, spanIndex) => {
      const normalizedSpan = span.toLowerCase();
      const exactTermHits = exactQuestionTerms.filter((term) => normalizedSpan.includes(term.toLowerCase())).length;
      const broadTermHits = terms.filter((term) => normalizedSpan.includes(term.toLowerCase())).length;
      const uploadedContextBoost = normalizedQuestion.includes("施設") && item.origin === "physician-upload" ? 25 : 0;
      const numericBoost = containsNumericRisk(span) ? 50 : 0;
      const score = exactTermHits * 100 + broadTermHits * 10 + numericBoost + uploadedContextBoost - evidenceIndex - spanIndex * 0.01;
      return { item, span, score, exactTermHits, broadTermHits };
    }),
  );

  const best = candidates
    .filter((candidate) => containsNumericRisk(candidate.span) && (candidate.exactTermHits > 0 || candidate.broadTermHits > 0))
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return undefined;

  const answerSpan = cleanFamilyAnswerSpan(best.span);
  const answer = `${answerSpan}${answerSpan.endsWith("。") ? "" : "。"}`;
  return { answer: answer.length <= 220 ? answer : `${answer.slice(0, 217)}...`, source: best.item };
}

function summarizeFromEvidence(question: string, evidence: EvidenceCard[]): string {
  if (isSexDifferenceQuestion(question)) {
    const sexDifference = summarizeSexDifferenceFromEvidence(evidence);
    if (sexDifference) return sexDifference.answer;
  }

  if (isComparativeQuestion(question)) {
    const mostRelevantSpan = summarizeMostRelevantSourceSpan(question, evidence);
    if (mostRelevantSpan) return mostRelevantSpan.answer;
  }

  const strokeRisk = summarizeStrokeRiskFromEvidence(question, evidence);
  if (strokeRisk) return strokeRisk.answer;

  const renalDialysisRisk = summarizeRenalDialysisRiskFromEvidence(question, evidence);
  if (renalDialysisRisk) return renalDialysisRisk.answer;

  const numericRisk = summarizeNumericRiskFromEvidence(question, evidence);
  if (numericRisk) return numericRisk.answer;

  const noSurgeryConsequence = summarizeNoSurgeryConsequenceFromEvidence(question, evidence);
  if (noSurgeryConsequence) return noSurgeryConsequence.answer;

  const reoperationPossibility = summarizeReoperationPossibilityFromEvidence(question, evidence);
  if (reoperationPossibility) return reoperationPossibility.answer;

  const genericStatement = summarizeGenericSourceBoundedStatementFromEvidence(question, evidence);
  if (genericStatement) return genericStatement.answer;

  if (isLongTermPrognosisQuestion(question)) {
    const longTerm = summarizeLongTermPrognosisFromEvidence(evidence);
    if (longTerm) return longTerm.answer;
  }

  if (isEmergencySurgeryNeedQuestion(question)) {
    const emergencyNeed = summarizeEmergencyNeedFromEvidence(evidence);
    if (emergencyNeed) return emergencyNeed.answer;
  }

  if (isDiseaseDefinitionQuestion(question)) {
    const definition = summarizeDiseaseDefinitionFromEvidence(evidence);
    if (definition) return definition.answer;
  }

  const primary = evidence[0];
  const answer = cleanFamilyAnswerSpan(primary.displayForFamily);
  return answer.length <= 180 ? answer : `${answer.slice(0, 177)}...`;
}

function getAnswerEvidence(question: string, evidence: EvidenceCard[]): EvidenceCard[] {
  if (isSexDifferenceQuestion(question)) {
    const sexDifference = summarizeSexDifferenceFromEvidence(evidence);
    if (sexDifference) return [sexDifference.source];
  }

  if (isComparativeQuestion(question)) {
    const mostRelevantSpan = summarizeMostRelevantSourceSpan(question, evidence);
    if (mostRelevantSpan) return [mostRelevantSpan.source];
  }

  const strokeRisk = summarizeStrokeRiskFromEvidence(question, evidence);
  if (strokeRisk) return [strokeRisk.source];

  const renalDialysisRisk = summarizeRenalDialysisRiskFromEvidence(question, evidence);
  if (renalDialysisRisk) return [renalDialysisRisk.source];

  const numericRisk = summarizeNumericRiskFromEvidence(question, evidence);
  if (numericRisk) return [numericRisk.source];

  const noSurgeryConsequence = summarizeNoSurgeryConsequenceFromEvidence(question, evidence);
  if (noSurgeryConsequence) return [noSurgeryConsequence.source];

  const reoperationPossibility = summarizeReoperationPossibilityFromEvidence(question, evidence);
  if (reoperationPossibility) return [reoperationPossibility.source];

  const genericStatement = summarizeGenericSourceBoundedStatementFromEvidence(question, evidence);
  if (genericStatement) return [genericStatement.source];

  if (isLongTermPrognosisQuestion(question)) {
    const longTerm = summarizeLongTermPrognosisFromEvidence(evidence);
    if (longTerm) return [longTerm.source];
  }

  if (isEmergencySurgeryNeedQuestion(question)) {
    const emergencyNeed = summarizeEmergencyNeedFromEvidence(evidence);
    if (emergencyNeed) return [emergencyNeed.source];
  }

  if (isDiseaseDefinitionQuestion(question)) {
    const definition = summarizeDiseaseDefinitionFromEvidence(evidence);
    if (definition) return [definition.source];
  }

  return evidence;
}

function noDirectAnswerResult(question: string): EvidenceBoundQAResult {
  const normalized = question.toLowerCase();
  const matchedPolicy = QUESTION_TERMS.find((group) =>
    group.terms.some((term) => normalized.includes(term.toLowerCase())),
  );
  return {
    answer: "選択済み参考資料内には、この質問に直接答えられる記載が見つかりません。",
    safetyLabel: matchedPolicy?.safetyLabel ?? "doctor-review",
    requiresDoctorReview: true,
    retrievalMode: "physician-curated-only",
    evidenceReferences: [],
    retrievedEvidence: [],
  };
}

function normalizeEvidenceSpan(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalSpanFromEvidence(span: string, evidence: EvidenceCard): string | undefined {
  const normalizedRequested = normalizeEvidenceSpan(span).toLowerCase();
  if (!normalizedRequested) return undefined;
  return splitEvidenceSpans(evidence).find((candidate) => {
    const normalizedCandidate = normalizeEvidenceSpan(candidate).toLowerCase();
    return normalizedCandidate === normalizedRequested || normalizedCandidate.includes(normalizedRequested) || normalizedRequested.includes(normalizedCandidate);
  });
}

function verifySupportingSpanExtraction(
  extraction: SupportingSpanExtraction,
  selectedEvidence: EvidenceCard[],
): { verified: Array<{ evidence: EvidenceCard; text: string }>; report: CitationVerificationReport } {
  const verified: Array<{ evidence: EvidenceCard; text: string }> = [];
  const rejectedSpans: CitationVerificationReport["rejectedSpans"] = [];

  if (extraction.answerable && extraction.supportingSpans.length > 0) {
    const selectedById = new Map(selectedEvidence.map((item) => [item.evidenceId, item]));
    for (const requested of extraction.supportingSpans) {
      const evidence = selectedById.get(requested.evidenceId);
      if (!evidence) {
        rejectedSpans.push({ evidenceId: requested.evidenceId, span: requested.span, reason: "unknown-evidence" });
        continue;
      }
      const canonical = canonicalSpanFromEvidence(requested.span, evidence);
      if (!canonical) {
        rejectedSpans.push({ evidenceId: requested.evidenceId, span: requested.span, reason: "span-not-found-in-source" });
        continue;
      }
      if (!verified.some((item) => item.evidence.evidenceId === evidence.evidenceId && item.text === canonical)) {
        verified.push({ evidence, text: canonical });
      }
    }
  }

  const cappedVerified = verified.slice(0, 3);
  return {
    verified: cappedVerified,
    report: {
      requestedSpanCount: extraction.supportingSpans.length,
      verifiedSpans: cappedVerified.map((item) => ({ evidenceId: item.evidence.evidenceId, text: item.text })),
      rejectedSpans,
    },
  };
}

export function verifyCitationSpans(
  extraction: SupportingSpanExtraction,
  selectedEvidence: EvidenceCard[],
): CitationVerificationReport {
  return verifySupportingSpanExtraction(extraction, selectedEvidence).report;
}

/**
 * 決定論パスの supportingSpans も agentic パスと同じ機械検証を通し、
 * UIの「出典照合済み」表示を両経路で統一するためのレポートを作る。
 */
export function buildCitationVerificationForSupportingSpans(
  supportingSpans: Array<{ evidenceId: string; text: string }> | undefined,
  selectedEvidence: EvidenceCard[],
): CitationVerificationReport | undefined {
  if (!supportingSpans || supportingSpans.length === 0) return undefined;
  return verifySupportingSpanExtraction({
    answerable: true,
    confidence: "moderate",
    reason: "deterministic-source-bounded supporting spans",
    supportingSpans: supportingSpans.map((span) => ({ evidenceId: span.evidenceId, span: span.text })),
  }, selectedEvidence).report;
}

function isLowInformationSupportingSpan(span: string): boolean {
  const normalized = span.toLowerCase();
  const hasOutcomeSignal = /死亡|死亡率|予後|遠隔|合併症|発生|リスク|高|低|良好|不良|mortality|survival|outcome|risk|rate|incidence|higher|lower|better|worse|than|compared|%|％/.test(normalized);
  const looksLikeTitleOrScope = /meta-analysis|systematic review|メタ解析|比較論文|review\.?$|study\.?$/.test(normalized);
  return looksLikeTitleOrScope && !hasOutcomeSignal;
}

function chooseAnswerSupportingSpans(spans: Array<{ evidence: EvidenceCard; text: string }>): Array<{ evidence: EvidenceCard; text: string }> {
  if (spans.length <= 1) return spans;
  const informative = spans.filter((item) => !isLowInformationSupportingSpan(item.text));
  return informative.length > 0 ? informative : spans;
}

function isMostlyNonJapaneseText(text: string): boolean {
  const japaneseChars = (text.match(/[ぁ-んァ-ヶー一-龠]/g) ?? []).length;
  const asciiLetters = (text.match(/[A-Za-z]/g) ?? []).length;
  return asciiLetters >= 30 && asciiLetters > japaneseChars * 2;
}

type EvidenceOutcomeTranslation = {
  pattern: RegExp;
  label: string;
  plainLabel?: string;
};

const EVIDENCE_OUTCOME_TRANSLATIONS: EvidenceOutcomeTranslation[] = [
  { pattern: /tracheostom(?:y|ies)|tracheotom(?:y|ies)/i, label: "気管切開" },
  { pattern: /prolonged (?:mechanical )?ventilation|prolonged ventilator/i, label: "長期人工呼吸" },
  { pattern: /dialysis|renal replacement therapy|continuous renal replacement therapy|\bCRRT\b/i, label: "透析または腎代替療法", plainLabel: "透析" },
  { pattern: /acute kidney injury|\bAKI\b/i, label: "急性腎障害（AKI）" },
  { pattern: /acute renal failure|\bARF\b|renal failure/i, label: "腎不全" },
  { pattern: /respiratory failure/i, label: "呼吸不全" },
  { pattern: /pneumonia/i, label: "肺炎" },
  { pattern: /postoperative pulmonary complications?|\bPPCs?\b/i, label: "術後肺合併症" },
  { pattern: /mortality|death/i, label: "死亡" },
  { pattern: /bleeding|re-?exploration|reoperation/i, label: "出血または再手術" },
];

function uniqueLabels(labels: string[]): string[] {
  return Array.from(new Set(labels.filter(Boolean)));
}

function labelsFromEnglishEvidenceSpan(span: string): string[] {
  return uniqueLabels(
    EVIDENCE_OUTCOME_TRANSLATIONS
      .filter((item) => item.pattern.test(span))
      .map((item) => item.label),
  );
}

function translateEnglishEvidenceSpanToJapanese(span: string): string | undefined {
  const normalized = span.replace(/\s+/g, " ").trim().replace(/[。.]+$/g, "");
  if (!isMostlyNonJapaneseText(normalized)) return undefined;
  const labels = labelsFromEnglishEvidenceSpan(normalized);
  if (labels.length === 0) return undefined;

  const percent = normalized.match(/\d+(?:\.\d+)?\s*[％%]/)?.[0]?.replace("％", "%");
  const mainLabel = labels[0];
  const associatedLabels = labels.slice(1, 4);
  const hasRequiredOrOccurred = /\b(?:was|were)\s+(?:required|necessary|performed|reported|observed)|occurred|developed|incidence|rate/i.test(normalized);
  if (percent && hasRequiredOrOccurred) {
    const association = associatedLabels.length > 0 ? ` ${associatedLabels.join("、")}との関連も記載されています。` : "";
    return `${mainLabel}は${percent}と報告されています。${association}`.replace(/。\s+/g, "。");
  }

  return undefined;
}

function answerFromSupportingSpans(spans: Array<{ text: string }>): string {
  const translated = spans
    .map((item) => translateEnglishEvidenceSpanToJapanese(item.text))
    .filter((item): item is string => Boolean(item));
  const answer = (translated.length > 0 ? translated : spans.map((item) => cleanFamilyAnswerSpan(item.text)))
    .filter(Boolean)
    .join("。")
    .replace(/。+/g, "。");
  const normalizedAnswer = answer.endsWith("。") ? answer : `${answer}。`;
  const capped = normalizedAnswer.length <= 260 ? normalizedAnswer : `${normalizedAnswer.slice(0, 257)}...`;
  // 定型変換で日本語化できなかった英語原文は、そのまま回答本文にせず日本語の枠で提示する。
  // 原文の内容は一字も変えない（言い換えの失敗をハルシネーションで埋めない）。
  if (isMostlyNonJapaneseText(capped)) {
    const quoted = capped.replace(/[。.]+$/, "");
    return `医師が選んだ資料には「${quoted}」という記載があります。やさしい言葉での補足は担当医が行います。`;
  }
  return capped;
}

function normalizeGroundingNumber(value: string): string {
  return value.replace(/[％]/g, "%").replace(/\s+/g, "").toLowerCase();
}

function makePatientFriendlyAnswer(answer: string): string {
  return answer
    .replace(/\n?根拠論文:[\s\S]*$/g, "")
    .replace(/\n?引用箇所:[\s\S]*$/g, "")
    .replace(/^\s*(?:この資料では|選択された(?:資料|論文|ガイドライン)では|選択済み参考資料では|参考資料では)、\s*/g, "")
    .replace(/（\s*(?:OR|RR|HR|odds ratio|risk ratio|hazard ratio)[^）)]*(?:95%\s*(?:信頼区間|CI)[^）)]*)?[）)]/gi, "")
    .replace(/\s+/g, " ")
    .replace(/。。+/g, "。")
    .trim();
}

// 根拠スパンからは導けない安心・保証の言い切り。家族向けの言い換えであっても、
// これらは資料の内容を捻じ曲げるためモデル回答ごと棄却する。
const UNGROUNDABLE_REASSURANCE_PATTERN =
  /心配(?:は)?(?:あり|いり)ません|ご?安心(?:して)?ください|安心です|安全です|問題(?:は)?ありません|必ず(?:助かり|成功|治り|良くなり)|確実に(?:助かり|成功|回復)|100\s*[%％]\s*(?:安全|成功|大丈夫)|リスクは(?:ほぼ)?ありません|後遺症は(?:残り|あり)ません|ほとんど(?:の方)?(?:は|が)(?:回復|助かり|治り)/;

// 「リスクが低い/まれ/高い」等の程度の断定は、根拠スパン側に対応する数値・比較・
// 記載がある場合だけ許可する（やさしい言い換えと内容の改変を区別する境界線）。
function makesUngroundedRiskLevelClaim(answer: string, supportingText: string): boolean {
  const claimsLowRisk =
    /(?:リスク|危険|合併症|可能性|頻度|確率)[^。]{0,14}?(?:とても低|非常に低|低い|少ない|小さい|まれ|稀)/.test(answer) ||
    /(?:まれ|稀)な(?:合併症|副作用)/.test(answer);
  if (claimsLowRisk && !/低|少な|まれ|稀|low|rare|infrequent|uncommon|minor|small/i.test(supportingText)) {
    return true;
  }
  const claimsHighRisk = /(?:リスク|危険|合併症|可能性|頻度|確率)[^。]{0,14}?(?:とても高|非常に高|高い|大きい|多い|高くな|高ま)/.test(answer);
  if (claimsHighRisk && !/高|増加|上昇|多|悪化|リスク因子|関連|危険|high|increase|greater|elevated|risk factors?|associated|odds|\bOR\b|\bRR\b|\bHR\b/i.test(supportingText)) {
    return true;
  }
  return false;
}

// 難しい医学用語への短い注釈。疾患概念として普遍的に正しい説明だけを（）で足し、
// 根拠の内容（数値・比較・結論）には一切手を加えない。
const FAMILY_TERM_GLOSSARY: Array<{ term: string; note: string }> = [
  { term: "心タンポナーデ", note: "心臓の周りに血液がたまり、心臓が十分に動けなくなる状態" },
  { term: "対麻痺", note: "両足が動かしにくくなる麻痺" },
  { term: "せん妄", note: "一時的に意識が混乱する状態" },
  { term: "人工心肺", note: "手術中に心臓と肺の働きを代わりに行う装置" },
  { term: "腎代替療法", note: "透析など、腎臓の働きを機械で補う治療" },
  { term: "脊髄虚血", note: "脊髄への血流が足りなくなること" },
];

export function appendFamilyTermGlossary(answer: string): string {
  let result = answer;
  let added = 0;
  for (const { term, note } of FAMILY_TERM_GLOSSARY) {
    if (added >= 2) break;
    const index = result.indexOf(term);
    if (index === -1) continue;
    const after = result.slice(index + term.length);
    if (after.startsWith("（") || after.startsWith("(")) continue;
    // 「人工心肺時間」のような複合語の途中には注釈を差し込まない。
    const nextChar = after.charAt(0);
    if (nextChar && !/[ぁ-ん、。，．・）」\s]/.test(nextChar)) continue;
    if (result.includes(note)) continue;
    result = `${result.slice(0, index + term.length)}（${note}）${after}`;
    added += 1;
  }
  return result;
}
function extractGroundingNumbers(text: string): string[] {
  const matches = [
    ...(text.match(/\d+(?:\.\d+)?\s*[％%]/g) ?? []),
    ...(text.match(/\b\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\b/g) ?? []),
  ];
  return Array.from(new Set(matches.map(normalizeGroundingNumber).filter((item) => item.length > 0)));
}

function isIndividualPrognosisQuestion(normalizedQuestion: string): boolean {
  return /成功率|助か|生きて|帰れ|生存|個別.*予後/.test(normalizedQuestion);
}

function isAdministrativeNonEvidenceQuestion(normalizedQuestion: string): boolean {
  return /費用|医療費|料金|支払|支払い|自己負担|保険|高額療養|請求|会計|cost|price|billing|payment|insurance/.test(normalizedQuestion);
}

function administrativeNoDirectAnswerResult(): EvidenceBoundQAResult {
  return {
    answer: "選択済み参考資料内には、手術費用や支払い制度に直接答えられる記載が見つかりません。費用は保険の種類、入院期間、術式、病院の制度で変わるため、病院の医事課・相談窓口または担当医に確認してください。",
    safetyLabel: "doctor-review",
    requiresDoctorReview: true,
    retrievalMode: "physician-curated-only",
    evidenceReferences: [],
    retrievedEvidence: [],
  };
}

/**
 * 資料検索やLLM抽出を行う前に確定できる回答（費用などの事務質問、施設テンプレ、
 * 個別予後、同意誘導の拒否）を返す。該当しなければ undefined。
 * 重いPDF再取得・Gemini呼び出しの前段でも安全に呼べる。
 */
export function resolveNonEvidenceQAResult(
  question: string,
  facilityAnswerTemplates?: FacilityAnswerTemplate[],
): EvidenceBoundQAResult | undefined {
  const normalized = question.toLowerCase();

  if (isAdministrativeNonEvidenceQuestion(normalized)) {
    return administrativeNoDirectAnswerResult();
  }

  const facilityTemplate = findMatchingFacilityTemplate(question, facilityAnswerTemplates);
  if (facilityTemplate) {
    return {
      answer: facilityTemplate.answer,
      safetyLabel: "facility-template",
      requiresDoctorReview: false,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [facilityTemplate.templateId],
      retrievedEvidence: [],
      templateReferences: [facilityTemplate],
      extractionMode: "facility-template",
    };
  }

  if (isIndividualPrognosisQuestion(normalized)) {
    return {
      answer: "その質問は患者さんごとの状態で大きく変わるため、選択済み参考資料だけでAIが断定することはできません。担当医が今の状態と手術リスクを見ながら直接説明します。",
      safetyLabel: "individual-prognosis",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  if (normalized.includes("同意") || normalized.includes("受けるべき") || normalized.includes("やるべき")) {
    return {
      answer: "AIが同意を勧めたり決めたりすることはできません。参考資料の範囲を整理し、最終判断は担当医と確認してください。",
      safetyLabel: "consent-guidance",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  return undefined;
}

function isGroundedPatientFriendlyAnswer(answer: string | undefined, verifiedSpans: Array<{ text: string }>): answer is string {
  if (!answer) return false;
  const normalizedAnswer = answer.replace(/\s+/g, " ").trim();
  if (normalizedAnswer.length < 12 || normalizedAnswer.length > 520) return false;
  if (/選択済み参考資料内には|直接答えられる記載が見つかりません|根拠論文:|引用箇所:|PMID|Wang et al\.|The synthesized|A total of|overall in-hospital mortality/i.test(normalizedAnswer)) return false;
  if (/^(?:この資料では|選択された(?:資料|論文|ガイドライン)では|選択済み参考資料では|参考資料では)、/.test(normalizedAnswer)) return false;
  if (UNGROUNDABLE_REASSURANCE_PATTERN.test(normalizedAnswer)) return false;

  const supportingText = verifiedSpans.map((item) => item.text).join(" ");
  if (makesUngroundedRiskLevelClaim(normalizedAnswer, supportingText)) return false;
  const supportingNumbers = new Set(extractGroundingNumbers(supportingText));
  const answerNumbers = extractGroundingNumbers(normalizedAnswer);
  return answerNumbers.every((number) => supportingNumbers.has(number));
}

export function synthesizeEvidenceBoundQAFromSupportingSpans(
  question: string,
  context: ConsentQAContext,
  extraction: SupportingSpanExtraction,
): EvidenceBoundQAResult {
  const nonEvidenceResult = resolveNonEvidenceQAResult(question, context.facilityAnswerTemplates);
  if (nonEvidenceResult) return nonEvidenceResult;

  const verification = verifySupportingSpanExtraction(extraction, context.selectedEvidence);
  const verifiedSpans = chooseAnswerSupportingSpans(verification.verified);
  if (verifiedSpans.length === 0) {
    return { ...noDirectAnswerResult(question), citationVerification: verification.report };
  }

  const evidenceById = new Map(verifiedSpans.map((item) => [item.evidence.evidenceId, item.evidence]));
  const groundedPatientFriendlyAnswer = isGroundedPatientFriendlyAnswer(extraction.familyAnswer, verifiedSpans)
    ? makePatientFriendlyAnswer(extraction.familyAnswer)
    : undefined;
  const answer = appendFamilyTermGlossary(groundedPatientFriendlyAnswer ?? answerFromSupportingSpans(verifiedSpans));
  return {
    answer,
    safetyLabel: extraction.confidence === "low" ? "doctor-review" : "general",
    requiresDoctorReview: extraction.confidence === "low",
    retrievalMode: "physician-curated-only",
    evidenceReferences: Array.from(evidenceById.keys()),
    retrievedEvidence: Array.from(evidenceById.values()),
    supportingSpans: verifiedSpans.map((item) => ({ evidenceId: item.evidence.evidenceId, text: item.text })),
    extractionMode: "agentic-source-bounded",
    citationVerification: verification.report,
  };
}

export function synthesizeEvidenceBoundQA(
  question: string,
  context: {
    diagnosis: string;
    plannedSurgery: string;
    risks: string[];
    selectedEvidence: EvidenceCard[];
    facilityAnswerTemplates?: FacilityAnswerTemplate[];
  },
): EvidenceBoundQAResult {
  const normalized = question.toLowerCase();

  const nonEvidenceResult = resolveNonEvidenceQAResult(question, context.facilityAnswerTemplates);
  if (nonEvidenceResult) return nonEvidenceResult;

  const relevantEvidence = findAnswerableSelectedEvidence(question, context.selectedEvidence);
  const matchedPolicy = QUESTION_TERMS.find((group) =>
    group.terms.some((term) => normalized.includes(term.toLowerCase())),
  );

  if (isTracheostomyQuestion(question) && !hasTracheostomyEvidence(relevantEvidence)) {
    return {
      answer: "選択済み参考資料内には、この質問に直接答えられる気管切開や人工呼吸管理に関する記載が見つかりません。術後に気管切開が必要になるかは、呼吸状態、意識状態、感染、再手術や集中治療の経過によって変わるため、担当医が現在の状態に合わせて説明します。",
      safetyLabel: matchedPolicy?.safetyLabel ?? "doctor-review",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  if (relevantEvidence.length === 0) {
    const genericRisk = matchedPolicy || !isGenericSourceBoundedFallbackQuestion(question) ? undefined : summarizeGenericSourceBoundedRiskFromEvidence(question, context.selectedEvidence);
    if (genericRisk) {
      return {
        answer: appendFamilyTermGlossary(genericRisk.answer),
        safetyLabel: "general",
        requiresDoctorReview: false,
        retrievalMode: "physician-curated-only",
        evidenceReferences: [genericRisk.source.evidenceId],
        retrievedEvidence: [genericRisk.source],
        supportingSpans: [{ evidenceId: genericRisk.source.evidenceId, text: genericRisk.span }],
      };
    }
    const genericStatement = matchedPolicy ? undefined : summarizeGenericSourceBoundedStatementFromEvidence(question, context.selectedEvidence);
    if (genericStatement) {
      return {
        answer: appendFamilyTermGlossary(genericStatement.answer),
        safetyLabel: "general",
        requiresDoctorReview: false,
        retrievalMode: "physician-curated-only",
        evidenceReferences: [genericStatement.source.evidenceId],
        retrievedEvidence: [genericStatement.source],
        supportingSpans: [{ evidenceId: genericStatement.source.evidenceId, text: genericStatement.span }],
      };
    }
    return {
      answer: "選択済み参考資料内には、この質問に直接答えられる記載が見つかりません。",
      safetyLabel: matchedPolicy?.safetyLabel ?? "doctor-review",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  if (isNumericRiskQuestion(question) && !summarizeNumericRiskFromEvidence(question, relevantEvidence)) {
    return {
      answer: "選択済み参考資料内には、この質問に直接答えられる数値記載が見つかりません。",
      safetyLabel: matchedPolicy?.safetyLabel ?? "doctor-review",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  if (isRenalDialysisRiskQuestion(question) && !summarizeRenalDialysisRiskFromEvidence(question, relevantEvidence)) {
    return {
      answer: "選択済み参考資料内には、透析や腎障害についてこの質問に直接答えられる記載が見つかりません。透析が必要になるかは、術前腎機能、手術経過、術後の尿量や検査値を担当医が確認して説明します。",
      safetyLabel: matchedPolicy?.safetyLabel ?? "doctor-review",
      requiresDoctorReview: true,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [],
      retrievedEvidence: [],
    };
  }

  const answerEvidence = getAnswerEvidence(question, relevantEvidence);
  const renalDialysisRisk = summarizeRenalDialysisRiskFromEvidence(question, answerEvidence);
  const noSurgeryConsequence = renalDialysisRisk ? undefined : summarizeNoSurgeryConsequenceFromEvidence(question, answerEvidence);
  const reoperationPossibility = renalDialysisRisk || noSurgeryConsequence ? undefined : summarizeReoperationPossibilityFromEvidence(question, answerEvidence);
  const genericRisk = renalDialysisRisk || noSurgeryConsequence || reoperationPossibility || !isGenericSourceBoundedFallbackQuestion(question) ? undefined : summarizeGenericSourceBoundedRiskFromEvidence(question, answerEvidence);
  const genericStatement = renalDialysisRisk || noSurgeryConsequence || reoperationPossibility || genericRisk ? undefined : summarizeGenericSourceBoundedStatementFromEvidence(question, answerEvidence);
  const primaryAnswerSource = renalDialysisRisk?.source ?? noSurgeryConsequence?.source ?? reoperationPossibility?.source ?? genericRisk?.source ?? genericStatement?.source ?? answerEvidence[0];
  const primaryCitationSpan = renalDialysisRisk?.span ?? noSurgeryConsequence?.span ?? reoperationPossibility?.span ?? genericRisk?.span ?? genericStatement?.span ?? (primaryAnswerSource ? selectBestCitationSpanForQuestion(question, primaryAnswerSource) : undefined);
  const baseAnswer = renalDialysisRisk?.answer ?? noSurgeryConsequence?.answer ?? reoperationPossibility?.answer ?? genericRisk?.answer ?? genericStatement?.answer ?? summarizeFromEvidence(question, answerEvidence);
  const shouldAppendCitation =
    Boolean(renalDialysisRisk) ||
    Boolean(noSurgeryConsequence) ||
    Boolean(reoperationPossibility) ||
    Boolean(genericRisk) ||
    Boolean(genericStatement) ||
    isNumericRiskQuestion(question) ||
    isStrokeRiskQuestion(question) ||
    isRenalDialysisRiskQuestion(question) ||
    isComparativeQuestion(question) ||
    isLongTermPrognosisQuestion(question) ||
    isSexDifferenceQuestion(question);
  const answer = appendFamilyTermGlossary(baseAnswer);
  const supportingSpans = shouldAppendCitation && primaryAnswerSource && primaryCitationSpan
    ? [{ evidenceId: primaryAnswerSource.evidenceId, text: primaryCitationSpan }]
    : undefined;

  return {
    answer,
    safetyLabel: "general",
    requiresDoctorReview: false,
    retrievalMode: "physician-curated-only",
    evidenceReferences: answerEvidence.map((item) => item.evidenceId),
    retrievedEvidence: answerEvidence,
    supportingSpans,
  };
}

export function generateExplanationCards(
  demoCase: DemoCase,
  evidence: EvidenceCard[],
): ExplanationCard[] {
  const [registry, guideline, complications] = evidence;
  return [
    {
      id: "why-emergency",
      title: "なぜ今すぐ説明が必要か",
      audience: "family",
      body: `${demoCase.diagnosis} は命に関わる緊急疾患です。手術の目的は破裂、心タンポナーデ、臓器血流障害などを防ぐことです。`,
      evidenceIds: [registry?.evidenceId].filter(Boolean) as string[],
      doctorReviewRequired: true,
    },
    {
      id: "what-surgery",
      title: "予定されている治療",
      audience: "family",
      body: `主な治療は ${demoCase.proposedProcedure} です。裂けた大動脈を人工血管で置き換えることを目指します。`,
      evidenceIds: [guideline?.evidenceId].filter(Boolean) as string[],
      doctorReviewRequired: true,
    },
    {
      id: "risks",
      title: "重要なリスク",
      audience: "family",
      body: "出血、脳梗塞、腎不全、臓器血流障害、集中治療の長期化などが起こり得ます。個別の見通しは医師が患者状態を踏まえて説明します。",
      evidenceIds: [complications?.evidenceId].filter(Boolean) as string[],
      doctorReviewRequired: true,
    },
    {
      id: "ai-boundary",
      title: "AIの役割と限界",
      audience: "family",
      body: "この画面は説明の整理と理解確認を支援します。最終的な判断、手術適応、同意確認は担当医が行います。",
      evidenceIds: evidence.map((item) => item.evidenceId),
      doctorReviewRequired: false,
    },
  ];
}

export function scoreUnderstandingCheck(
  answers: UnderstandingAnswers,
): UnderstandingResult {
  const checks = [answers.purpose, answers.emergency, answers.alternative];
  const correctCount = checks.filter(Boolean).length;
  const safetyFlags: string[] = [];
  const question = answers.doctorQuestion.toLowerCase();

  if (!answers.alternative) {
    safetyFlags.push("代替選択肢・保存的治療の理解を医師が補足する必要");
  }
  if (
    question.includes("成功率") ||
    question.includes("断定") ||
    question.includes("助か") ||
    question.includes("survival")
  ) {
    safetyFlags.push("個別予後・成功率の断定は医師確認が必要");
  }

  const requiresDoctorReview = correctCount < checks.length || safetyFlags.length > 0;

  return {
    correctCount,
    totalCount: checks.length,
    requiresDoctorReview,
    safetyFlags,
    physicianSummary: requiresDoctorReview
      ? "家族の理解確認で追加説明が必要です。赤旗項目を医師が確認してください。"
      : "主要項目の理解は良好です。最終確認は医師が実施してください。",
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patientIdentifierTerms(demoCase: DemoCase): string[] {
  return demoCase.patientLabel
    .split(/[／/,]/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function redactPatientIdentifiers(value: string, demoCase: DemoCase): string {
  return patientIdentifierTerms(demoCase).reduce(
    (redacted, term) => redacted.replace(new RegExp(escapeRegExp(term), "g"), "[REDACTED]"),
    value,
  )
    .replace(/\b(?:MRN|ID)\s*[-:：]?\s*\d{3,}\b/gi, "[REDACTED]")
    .replace(/\b\d{6,}\b/g, "[REDACTED]");
}

function redactPatientIdentifierList(values: string[], demoCase: DemoCase): string[] {
  return values.map((value) => redactPatientIdentifiers(value, demoCase));
}

export function buildConsentExport(
  demoCase: DemoCase,
  evidence: EvidenceCard[],
  cards: ExplanationCard[],
  understanding: UnderstandingResult,
  handoff?: PhysicianHandoffDetails,
): ConsentExport {
  const evidenceCoverage = handoff?.evidenceSufficiency ?? evaluateEvidenceSufficiency(evidence);
  const selectedEvidenceIdSet = new Set(evidence.map((item) => item.evidenceId));
  const physicianHandoff = {
    summary: handoff
      ? {
          understood: redactPatientIdentifierList(handoff.summary.understood, demoCase),
          notUnderstood: redactPatientIdentifierList(handoff.summary.notUnderstood, demoCase),
          concerns: redactPatientIdentifierList(handoff.summary.concerns, demoCase),
          doctorQuestions: redactPatientIdentifierList(handoff.summary.doctorQuestions, demoCase),
        }
      : { understood: [], notUnderstood: [], concerns: [], doctorQuestions: [] },
    qaLog: handoff
      ? handoff.qaLog.map((item) => ({
          question: redactPatientIdentifiers(item.question, demoCase),
          answer: redactPatientIdentifiers(item.answer, demoCase),
          safetyLabel: item.safetyLabel,
          evidenceReferences: (item.evidenceReferences ?? []).filter((evidenceId) => selectedEvidenceIdSet.has(evidenceId)),
        }))
      : [],
    evidenceCoverage,
    doctorReviewRequired:
      understanding.requiresDoctorReview ||
      evidenceCoverage.requiresPhysicianOverride ||
      (handoff?.summary.notUnderstood.length ?? 0) > 0 ||
      (handoff?.summary.doctorQuestions.length ?? 0) > 0 ||
      (handoff?.qaLog.some((item) => item.safetyLabel !== "general") ?? false),
    physicianOverrideUsed: handoff?.physicianOverrideUsed ?? false,
  };

  return {
    resourceType: "Consent",
    status: "draft",
    scope: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "treatment",
          display: "Treatment",
        },
      ],
    },
    category: [{ text: "Emergency surgical consent explanation support" }],
    patient: {
      reference: "Patient/demo-anonymous",
      display: "Anonymous demo patient",
    },
    dateTime: "2026-05-01T00:00:00.000Z",
    policyRule: {
      text: "Demo only. No real patient identifiers. Human physician remains responsible for final consent.",
    },
    provision: {
      type: "permit",
      action: [{ text: redactPatientIdentifiers(demoCase.proposedProcedure, demoCase) }],
      purpose: [{ text: "Emergency treatment explanation and documentation support" }],
    },
    sourceAttachment: {
      title: "MedEvidence Consent Agent Phase 1 Demo Export",
      contentType: "application/json",
      data: {
        caseId: "demo-anonymous-case",
        explanationCardIds: cards.map((card) => card.id),
        evidenceIds: evidence.map((item) => item.evidenceId),
        understanding,
        limitations: redactPatientIdentifierList(demoCase.nonGoals, demoCase),
        auditTrail: {
          evidencePolicy: "physician-curated-only",
          selectedEvidenceIds: evidence.map((item) => item.evidenceId),
          legalConsentStatus: "not-a-signed-consent",
          phiHandling: "No real PHI/PII is stored in this demo export; case and patient references are anonymized.",
        },
        physicianHandoff,
      },
    },
  };
}
