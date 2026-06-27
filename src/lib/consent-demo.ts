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
      "当院の説明資料では、大動脈解離は大動脈の壁の内側に裂け目ができ、壁の中へ血液が入り込む病気です。A型では破裂や心タンポナーデ、臓器への血流障害を防ぐため緊急手術を行う方針と、出血・脳梗塞・腎障害などの重要なリスクを説明します。",
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
      "出血・脳梗塞・腎障害など重大リスクを明示",
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

  return createPhysicianUploadedEvidence({
    title,
    fileName,
    sourceUrl,
    extractedText: familyEvidence,
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
  const summary = redactInlinePatientIdentifiers(
    input.clinicianSummary?.trim() || `${safeTitle}。医師がアップロードし、家族説明で引用可能と確認した資料。`,
  );
  const keyFindings = input.keyFindings?.length
    ? input.keyFindings.map(redactInlinePatientIdentifiers)
    : (excerpt ? [excerpt] : [summary]);

  return {
    evidenceId: `UP-${fingerprint}`,
    title: safeTitle,
    sourceType: "Uploaded",
    claim: normalizedText || summary,
    displayForFamily: excerpt || summary,
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
    quotedSpan: excerpt || summary,
    outcomeTags: input.outcomeTags?.length ? input.outcomeTags : inferOutcomeTags(normalizedText || summary),
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
  ["認知機能", "認知", "もの忘れ", "記憶", "cognitive", "cognition", "cognitive dysfunction", "postoperative cognitive dysfunction", "neurocognitive", "cognitive-dysfunction"],
  ["せん妄", "意識混乱", "混乱", "頭がぼーっと", "ぼーっと", "delirium", "confusion"],
  ["退院", "退院時", "退院後", "discharge", "at discharge", "post-discharge", "after discharge"],
  ["集中治療", "icu", "intensive care", "critical care", "icu-stay"],
  ["入院", "在院", "入院期間", "length of stay", "hospital stay", "hospitalization", "length-of-stay"],
  ["感染", "感染症", "infection", "sepsis"],
  ["妊娠", "妊孕性", "不妊", "fertility", "pregnancy", "reproductive", "fertility-pregnancy"],
  ["生活の質", "qol", "quality of life", "adl", "日常生活", "quality-of-life"],
  ["痛み", "疼痛", "pain"],
  ["再入院", "readmission", "rehospitalization"],
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
  if (["対麻痺", "脊髄障害", "脊髄", "spinal", "paraplegia"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["対麻痺", "脊髄障害", "脊髄", "spinal cord injury", "sci", "paraplegia", ...genericTerms]));
  }
  if (["長期", "予後", "遠隔", "経過", "フォロー", "サーベイランス", "late", "long-term", "surveillance"].some((term) => normalized.includes(term.toLowerCase()))) {
    return Array.from(new Set(["長期", "長期的", "予後", "遠隔期", "遠隔", "晩期", "再手術", "大動脈再手術", "経過", "フォロー", "サーベイランス", "late mortality", "late", "long-term", "surveillance", "follow-up", "aortic re-operation", "reoperation", "late-survival", ...genericTerms]));
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
function isSexDifferenceQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return ["男女差", "性差", "男女", "女性", "男性", "sex", "female", "male", "women", "men"].some((term) =>
    normalized.includes(term.toLowerCase()),
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
  return ["長期", "長期的", "予後", "遠隔", "経過", "フォロー", "サーベイランス", "late", "long-term", "surveillance", "follow-up"].some((term) =>
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
    .flatMap((token) => token.split(/[とや]|(?:vs)/i))
    .map((token) => token.trim())
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

  return span
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

function isRenalDialysisRiskQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const asksRenal = /透析|腎|腎不全|急性腎障害|aki|renal|kidney|dialysis/.test(normalized);
  const asksRisk = /リスク|risk|起こ|合併症|可能性|危険|について/.test(normalized);
  return asksRenal && asksRisk;
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

function makeCitationLabel(source: EvidenceCard): string {
  return source.citation || [source.title, source.pmid ? `PMID: ${source.pmid}` : undefined].filter(Boolean).join(" ");
}

function makeAnswerWithCitation(answer: string, source: EvidenceCard, span: string): string {
  if (/根拠論文:|引用箇所:/.test(answer)) return answer;
  const normalizedAnswer = answer.endsWith("。") || answer.endsWith(".”") || answer.endsWith("」") ? answer : `${answer}。`;
  const citation = makeCitationLabel(source);
  const quote = cleanFamilyAnswerSpan(normalizeEvidenceSpan(span));
  return `${normalizedAnswer}\n根拠論文: ${citation}\n引用箇所: “${quote}”`;
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
  if (percent && isDirectDialysis) {
    return `大動脈解離術後に透析または腎代替療法が必要になるリスクは、選択された論文では${percent}と報告されています。`;
  }
  if (percent && /acute kidney injury|\bAKI\b|急性腎障害|腎不全|renal failure|kidney injury/i.test(normalized)) {
    return `選択された論文では、大動脈解離術後の急性腎障害（AKI）の発生率は${percent}と報告されています。透析そのものの発生率ではなく、透析につながり得る術後腎合併症の数値として説明します。`;
  }
  return cleanFamilyAnswerSpan(normalized);
}

function summarizeRenalDialysisRiskFromEvidence(question: string, evidence: EvidenceCard[]): { answer: string; source: EvidenceCard; span: string } | undefined {
  if (!isRenalDialysisRiskQuestion(question)) return undefined;

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
    const sourceScore =
      (/透析|dialysis/.test(haystack) ? 80 : 0) +
      (/急性腎障害|aki|renal|kidney|腎不全|腎障害/.test(haystack) ? 60 : 0) +
      (/risk factors?|リスク因子|incidence|発生|mortality|死亡/.test(haystack) ? 25 : 0) +
      (item.evidenceId.startsWith("PUBMED-") || item.retrievalStatus === "pubmed-verified" ? 20 : 0) -
      evidenceIndex * 0.01;
    const spans = splitEvidenceSpans(item).map((span, spanIndex) => {
      const numericFinding = extractRenalDialysisNumericFinding(span);
      const normalizedSpan = span.toLowerCase();
      const normalizedFinding = numericFinding?.toLowerCase() ?? "";
      const spanScore =
        (/透析|dialysis|renal replacement/.test(normalizedSpan) ? 80 : 0) +
        (/急性腎障害|aki|renal|kidney|腎不全|腎障害/.test(normalizedSpan) ? 60 : 0) +
        (/risk factors?|リスク因子|incidence|発生|mortality|死亡/.test(normalizedSpan) ? 25 : 0) +
        (numericFinding ? 120 : 0) +
        (/透析|dialysis|renal replacement/.test(normalizedFinding) ? 40 : 0) -
        spanIndex * 0.001;
      return { item, span, numericFinding, score: sourceScore + spanScore };
    });
    return spans.length > 0 ? spans : [{ item, span: item.displayForFamily, numericFinding: extractRenalDialysisNumericFinding(item.displayForFamily), score: sourceScore }];
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 80) return undefined;

  const supportingSpan = best.numericFinding ?? best.span;
  const body = translateRenalDialysisFindingForFamily(supportingSpan);
  const citation = makeCitationLabel(best.item);
  const answer = `${body}\n根拠論文: ${citation}\n引用箇所: “${supportingSpan}”`;
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
      const answer = `${readableSpan}と記載されています。`;
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

  const answer = cleanFamilyAnswerSpan(descriptiveSpan);
  return { answer: answer.length <= 180 ? answer : `${answer.slice(0, 177)}...`, source: descriptiveSource };
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
    .flatMap((part) => part.split(/(?<=[。!?？])\s*|(?<=[.!?])\s+(?=[A-Z])/))
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part, index, parts) => part.length >= 8 && parts.indexOf(part) === index);
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
  const answer = `選択済み参考資料では、${joined}と記載されています。`;
  return { answer: answer.length <= 300 ? answer : `${answer.slice(0, 297)}...`, source: firstSource };
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

function answerFromSupportingSpans(spans: Array<{ text: string }>): string {
  const answer = spans
    .map((item) => cleanFamilyAnswerSpan(item.text))
    .filter(Boolean)
    .join("。")
    .replace(/。+/g, "。");
  const normalizedAnswer = answer.endsWith("。") ? answer : `${answer}。`;
  return normalizedAnswer.length <= 260 ? normalizedAnswer : `${normalizedAnswer.slice(0, 257)}...`;
}

export function synthesizeEvidenceBoundQAFromSupportingSpans(
  question: string,
  context: ConsentQAContext,
  extraction: SupportingSpanExtraction,
): EvidenceBoundQAResult {
  const normalized = question.toLowerCase();

  const facilityTemplate = findMatchingFacilityTemplate(question, context.facilityAnswerTemplates);
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

  if (normalized.includes("成功率") || normalized.includes("助か")) {
    return {
      answer: "選択済み参考資料内だけでは、個別の成功率や死亡率は断定できません。担当医が患者さんの状態に合わせて直接補足します。",
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

  const verification = verifySupportingSpanExtraction(extraction, context.selectedEvidence);
  const verifiedSpans = chooseAnswerSupportingSpans(verification.verified);
  if (verifiedSpans.length === 0) {
    return { ...noDirectAnswerResult(question), citationVerification: verification.report };
  }

  const evidenceById = new Map(verifiedSpans.map((item) => [item.evidence.evidenceId, item.evidence]));
  const primarySpan = verifiedSpans[0];
  const answer = primarySpan
    ? makeAnswerWithCitation(answerFromSupportingSpans(verifiedSpans), primarySpan.evidence, primarySpan.text)
    : answerFromSupportingSpans(verifiedSpans);
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

  const facilityTemplate = findMatchingFacilityTemplate(question, context.facilityAnswerTemplates);
  if (facilityTemplate) {
    return {
      answer: facilityTemplate.answer,
      safetyLabel: "facility-template",
      requiresDoctorReview: false,
      retrievalMode: "physician-curated-only",
      evidenceReferences: [facilityTemplate.templateId],
      retrievedEvidence: [],
      templateReferences: [facilityTemplate],
    };
  }

  if (normalized.includes("成功率") || normalized.includes("助か")) {
    return {
      answer: "選択済み参考資料内だけでは、個別の成功率や死亡率は断定できません。担当医が患者さんの状態に合わせて直接補足します。",
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

  const relevantEvidence = findAnswerableSelectedEvidence(question, context.selectedEvidence);
  const matchedPolicy = QUESTION_TERMS.find((group) =>
    group.terms.some((term) => normalized.includes(term.toLowerCase())),
  );

  if (relevantEvidence.length === 0) {
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

  const answerEvidence = getAnswerEvidence(question, relevantEvidence);
  const renalDialysisRisk = summarizeRenalDialysisRiskFromEvidence(question, answerEvidence);
  const primaryAnswerSource = renalDialysisRisk?.source ?? answerEvidence[0];
  const primaryCitationSpan = renalDialysisRisk?.span ?? (primaryAnswerSource ? selectBestCitationSpanForQuestion(question, primaryAnswerSource) : undefined);
  const baseAnswer = renalDialysisRisk?.answer ?? summarizeFromEvidence(question, answerEvidence);
  const shouldAppendCitation =
    isNumericRiskQuestion(question) ||
    isStrokeRiskQuestion(question) ||
    isRenalDialysisRiskQuestion(question) ||
    isComparativeQuestion(question) ||
    isLongTermPrognosisQuestion(question) ||
    isSexDifferenceQuestion(question);
  const answer = shouldAppendCitation && primaryAnswerSource && primaryCitationSpan
    ? makeAnswerWithCitation(baseAnswer, primaryAnswerSource, primaryCitationSpan)
    : baseAnswer;
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
