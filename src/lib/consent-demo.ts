export type SourceType = "Registry" | "Guideline" | "Review";

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
    };
  };
};

const evidenceCards: EvidenceCard[] = [
  {
    evidenceId: "irad-ataad-emergency-001",
    title: "IRAD Registry: acute type A dissection early mortality and emergency repair",
    sourceType: "Registry",
    claim:
      "Acute type A aortic dissection is a life-threatening emergency where early surgical evaluation is standard.",
    displayForFamily:
      "A型大動脈解離は、時間が経つほど命に関わる危険が高くなるため、緊急手術が検討されます。",
    confidence: "high",
    citation: "IRAD Registry overview / PMID: 11794169",
    pmid: "11794169",
  },
  {
    evidenceId: "guideline-ataad-surgery-002",
    title: "Guideline recommendation: emergency surgery for acute type A dissection",
    sourceType: "Guideline",
    claim:
      "Guidelines generally recommend urgent surgical repair for acute type A dissection unless contraindications dominate.",
    displayForFamily:
      "標準的には、A型解離では破裂や心タンポナーデなどを防ぐため、手術が重要な選択肢になります。",
    confidence: "high",
    citation: "Aortic disease guideline summary / PMID: 36322642",
    pmid: "36322642",
  },
  {
    evidenceId: "review-complications-003",
    title: "Review: complications and postoperative intensive care needs",
    sourceType: "Review",
    claim:
      "Major risks include bleeding, stroke, organ malperfusion, renal failure, and prolonged intensive care.",
    displayForFamily:
      "手術後は出血、脳梗塞、腎臓や臓器の血流障害などに注意し、集中治療室で管理します。",
    confidence: "moderate",
    citation: "Surgical review / PMID: 28109565",
    pmid: "28109565",
  },
];

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

export function retrieveMockEvidence(query: string): EvidenceCard[] {
  const normalized = query.toLowerCase();
  if (!normalized.includes("dissection") && !normalized.includes("解離")) {
    return evidenceCards.slice(1, 3);
  }
  return evidenceCards;
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

export function buildConsentExport(
  demoCase: DemoCase,
  evidence: EvidenceCard[],
  cards: ExplanationCard[],
  understanding: UnderstandingResult,
): ConsentExport {
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
      display: demoCase.patientLabel,
    },
    dateTime: "2026-05-01T00:00:00.000Z",
    policyRule: {
      text: "Demo only. No real patient identifiers. Human physician remains responsible for final consent.",
    },
    provision: {
      type: "permit",
      action: [{ text: demoCase.proposedProcedure }],
      purpose: [{ text: "Emergency treatment explanation and documentation support" }],
    },
    sourceAttachment: {
      title: "MedEvidence Consent Agent Phase 1 Demo Export",
      contentType: "application/json",
      data: {
        caseId: demoCase.caseId,
        explanationCardIds: cards.map((card) => card.id),
        evidenceIds: evidence.map((item) => item.evidenceId),
        understanding,
        limitations: demoCase.nonGoals,
      },
    },
  };
}
