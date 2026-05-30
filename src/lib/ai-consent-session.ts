export type ConsentSessionStatus =
  | 'not_started'
  | 'explaining'
  | 'checking_understanding'
  | 'needs_reexplanation'
  | 'ready_for_physician_review';

export type UnderstandingLevel = 'clear' | 'partial' | 'unsafe';
export type ConsentNextAction = 'continue' | 'reexplain' | 'escalate_to_physician';

export interface ConsentCheckpoint {
  id: string;
  title: string;
  patientFacingExplanation: string;
  checkQuestion: string;
  expectedConcepts: string[];
  redFlags: string[];
}

export interface FamilyResponseEvaluation {
  checkpointId: string;
  checkpointTitle: string;
  level: UnderstandingLevel;
  score: number;
  missingConcepts: string[];
  redFlags: string[];
  recommendedNextAction: ConsentNextAction;
  evidence: {
    matchedConcepts: string[];
    sanitizedResponse: string;
  };
}

export interface ConsentIntentRecord {
  statedIntent: 'agrees' | 'declines' | 'undecided';
  confidence: 'high' | 'medium' | 'low';
  freeTextSummary: string;
  questionsForPhysician: string[];
}

export interface PhysicianConsentSummary {
  reviewStatus: 'physician_review_required';
  explainedCheckpointIds: string[];
  understandingGaps: Array<{
    checkpointId: string;
    title: string;
    missingConcepts: string[];
    recommendedNextAction: ConsentNextAction;
  }>;
  redFlags: string[];
  familyIntent: ConsentIntentRecord;
  questionsForPhysician: string[];
  physicianOnlyItems: string[];
  externalActionsBlocked: Array<'calendar.invite' | 'gmail.send' | 'drive.share'>;
  notSignedConsentNotice: string;
}

export interface ConsentExplanationRecord {
  recordType: 'demo_consent_explanation_record';
  caseId: 'demo-aortic-dissection';
  patientHandle: 'demo-anonymous-case';
  modelMode: 'mock' | 'gemini';
  explanationVersion: string;
  checkpoints: FamilyResponseEvaluation[];
  intent: ConsentIntentRecord;
  physicianReviewRequired: true;
  externalActionsBlocked: Array<'calendar.invite' | 'gmail.send' | 'drive.share'>;
  generatedAt: string;
}

const RED_FLAG_TERMS = ['わからない', '分からない', '怖い', '迷って', '死ぬ', '後遺症', '他の方法', '助かりますか', '必ず助か', '個別', '生存'];
const EXTERNAL_ACTIONS_BLOCKED = ['calendar.invite', 'gmail.send', 'drive.share'] as const;

export function buildAorticDissectionCheckpoints(): ConsentCheckpoint[] {
  return [
    {
      id: 'disease-mechanism',
      title: '今起きていること',
      patientFacingExplanation:
        '急性A型大動脈解離は、心臓から出る太い血管である大動脈の内側が裂け、血液が血管の壁の中へ流れ込む危険な状態です。破裂や心臓・脳への血流障害につながる可能性があります。',
      checkQuestion: '大動脈で何が起きていて、なぜ危険なのかをご自身の言葉で説明してください。',
      expectedConcepts: ['大動脈', '裂け', '破裂'],
      redFlags: RED_FLAG_TERMS,
    },
    {
      id: 'emergency-surgery-need',
      title: 'なぜ今すぐ手術が必要か',
      patientFacingExplanation:
        'A型解離は時間が経つほど破裂や命に関わる合併症のリスクが高まるため、薬だけで様子を見るのではなく、緊急手術で危険な部分を治療する必要があります。',
      checkQuestion: 'なぜ今すぐ手術が必要で、待つことにどのような危険があるかを教えてください。',
      expectedConcepts: ['緊急', '手術', '命'],
      redFlags: RED_FLAG_TERMS,
    },
    {
      id: 'procedure-and-risks',
      title: '予定している手術と主なリスク',
      patientFacingExplanation:
        '上行大動脈人工血管置換術では、裂けた大動脈の重要な部分を人工血管に置き換えます。出血、脳梗塞、腎不全、死亡など重大なリスクがあり、個別の見通しは医師が説明します。',
      checkQuestion: '予定手術の内容と、確認すべき主なリスクを教えてください。',
      expectedConcepts: ['人工血管', '出血', '脳梗塞'],
      redFlags: RED_FLAG_TERMS,
    },
  ];
}

export function evaluateFamilyResponse(
  checkpoint: ConsentCheckpoint,
  freeText: string,
): FamilyResponseEvaluation {
  const sanitizedResponse = sanitizeClinicalFreeText(freeText);
  const normalized = sanitizedResponse.toLowerCase();
  const matchedConcepts = checkpoint.expectedConcepts.filter(concept => normalized.includes(concept.toLowerCase()));
  const missingConcepts = checkpoint.expectedConcepts.filter(concept => !matchedConcepts.includes(concept));
  const redFlags = checkpoint.redFlags.filter(term => normalized.includes(term.toLowerCase()));
  const score = checkpoint.expectedConcepts.length === 0 ? 1 : matchedConcepts.length / checkpoint.expectedConcepts.length;

  let level: UnderstandingLevel;
  let recommendedNextAction: ConsentNextAction;
  if (redFlags.length > 0) {
    level = 'unsafe';
    recommendedNextAction = 'escalate_to_physician';
  } else if (score >= 0.65) {
    level = 'clear';
    recommendedNextAction = 'continue';
  } else {
    level = 'partial';
    recommendedNextAction = 'reexplain';
  }

  return {
    checkpointId: checkpoint.id,
    checkpointTitle: checkpoint.title,
    level,
    score: Number(score.toFixed(2)),
    missingConcepts,
    redFlags,
    recommendedNextAction,
    evidence: {
      matchedConcepts,
      sanitizedResponse,
    },
  };
}

export function buildPhysicianSummary(
  evaluations: FamilyResponseEvaluation[],
  intent: ConsentIntentRecord,
): PhysicianConsentSummary {
  const understandingGaps = evaluations
    .filter(evaluation => evaluation.level !== 'clear' || evaluation.missingConcepts.length > 0)
    .map(evaluation => ({
      checkpointId: evaluation.checkpointId,
      title: evaluation.checkpointTitle,
      missingConcepts: evaluation.missingConcepts,
      recommendedNextAction: evaluation.recommendedNextAction,
    }));
  const redFlags = Array.from(new Set(evaluations.flatMap(evaluation => evaluation.redFlags)));

  return {
    reviewStatus: 'physician_review_required',
    explainedCheckpointIds: evaluations.map(evaluation => evaluation.checkpointId),
    understandingGaps,
    redFlags,
    familyIntent: sanitizeIntent(intent),
    questionsForPhysician: sanitizeTextArray(intent.questionsForPhysician),
    physicianOnlyItems: [
      '個別の予後・生存可能性・施設別成績の説明',
      '最終的な治療選択と同意意思の確認',
      'AIが不確実または不安として検出した質問への回答',
    ],
    externalActionsBlocked: [...EXTERNAL_ACTIONS_BLOCKED],
    notSignedConsentNotice:
      'この記録は署名済み同意ではなく、医師最終確認前の同意説明支援レコードです。',
  };
}

export function buildConsentExplanationRecord(input: {
  evaluations: FamilyResponseEvaluation[];
  intent: ConsentIntentRecord;
  generatedAt?: string;
  modelMode: 'mock' | 'gemini';
}): ConsentExplanationRecord {
  return {
    recordType: 'demo_consent_explanation_record',
    caseId: 'demo-aortic-dissection',
    patientHandle: 'demo-anonymous-case',
    modelMode: input.modelMode,
    explanationVersion: 'aortic-dissection-omni-demo-v1',
    checkpoints: input.evaluations.map(evaluation => ({
      ...evaluation,
      evidence: {
        ...evaluation.evidence,
        sanitizedResponse: sanitizeClinicalFreeText(evaluation.evidence.sanitizedResponse),
      },
    })),
    intent: sanitizeIntent(input.intent),
    physicianReviewRequired: true,
    externalActionsBlocked: [...EXTERNAL_ACTIONS_BLOCKED],
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

function sanitizeIntent(intent: ConsentIntentRecord): ConsentIntentRecord {
  return {
    ...intent,
    freeTextSummary: sanitizeClinicalFreeText(intent.freeTextSummary),
    questionsForPhysician: sanitizeTextArray(intent.questionsForPhysician),
  };
}

function sanitizeTextArray(values: string[]): string[] {
  return values.map(value => sanitizeClinicalFreeText(value));
}

function sanitizeClinicalFreeText(value: string): string {
  return value
    .replace(/MRN[-_\s]*\d+/gi, '[REDACTED]')
    .replace(/\b\d{6,}\b/g, '[REDACTED]')
    .replace(/[一-龠々]{1,4}(?:太郎|花子|さん)/g, '[REDACTED]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED]')
    .trim();
}
