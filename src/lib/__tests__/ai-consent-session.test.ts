import { describe, expect, it } from 'vitest';
import {
  buildAorticDissectionCheckpoints,
  buildConsentExplanationRecord,
  buildPhysicianSummary,
  deriveConsentDecision,
  detectRedFlags,
  evaluateFamilyResponse,
  type ConsentIntentRecord,
  type FamilyResponseEvaluation,
} from '../ai-consent-session';

describe('aortic dissection consent checkpoints', () => {
  it('builds patient-facing checkpoints for the emergency surgery demo', () => {
    const checkpoints = buildAorticDissectionCheckpoints();

    expect(checkpoints).toHaveLength(3);
    expect(checkpoints.map(checkpoint => checkpoint.id)).toEqual([
      'disease-mechanism',
      'emergency-surgery-need',
      'procedure-and-risks',
    ]);
    expect(checkpoints[0].patientFacingExplanation).toContain('大動脈');
    expect(checkpoints[1].checkQuestion).toContain('手術');
  });
});

describe('evaluateFamilyResponse', () => {
  const [mechanismCheckpoint, urgencyCheckpoint, riskCheckpoint] = buildAorticDissectionCheckpoints();

  it('marks sufficient free-text understanding as clear and continue', () => {
    const evaluation = evaluateFamilyResponse(
      mechanismCheckpoint,
      '大動脈の内側が裂けて血液が壁の中に入り、放置すると破裂の危険がある状態だと理解しました。',
    );

    expect(evaluation.level).toBe('clear');
    expect(evaluation.recommendedNextAction).toBe('continue');
    expect(evaluation.score).toBeGreaterThanOrEqual(0.65);
    expect(evaluation.missingConcepts).toHaveLength(0);
  });

  it('marks vague answers as partial and asks for re-explanation', () => {
    const evaluation = evaluateFamilyResponse(urgencyCheckpoint, '急いだ方がよいということは分かりました。');

    expect(evaluation.level).toBe('partial');
    expect(evaluation.recommendedNextAction).toBe('reexplain');
    expect(evaluation.missingConcepts.length).toBeGreaterThan(0);
  });

  it('escalates strong anxiety or individual questions to the physician', () => {
    const evaluation = evaluateFamilyResponse(
      riskCheckpoint,
      '怖いです。父は必ず助かりますか。後遺症や死ぬ可能性について医師に直接聞きたいです。',
    );

    expect(evaluation.level).toBe('unsafe');
    expect(evaluation.redFlags.length).toBeGreaterThan(0);
    expect(evaluation.recommendedNextAction).toBe('escalate_to_physician');
  });
});

describe('buildPhysicianSummary', () => {
  it('collects only misunderstanding, red flags, intent, and physician-required items', () => {
    const checkpoints = buildAorticDissectionCheckpoints();
    const evaluations = [
      evaluateFamilyResponse(checkpoints[0], '大動脈が裂けて破裂の危険があります。'),
      evaluateFamilyResponse(checkpoints[1], '少し分かりません。ほかの方法はないですか。'),
    ];
    const intent: ConsentIntentRecord = {
      statedIntent: 'undecided',
      confidence: 'low',
      freeTextSummary: '不安が強く、医師ともう一度話してから決めたい。',
      questionsForPhysician: ['助かる確率を個別に教えてほしい'],
    };

    const summary = buildPhysicianSummary(evaluations, intent);

    expect(summary.reviewStatus).toBe('physician_review_required');
    expect(summary.explainedCheckpointIds).toContain('disease-mechanism');
    expect(summary.understandingGaps.length).toBeGreaterThan(0);
    expect(summary.questionsForPhysician).toContain('助かる確率を個別に教えてほしい');
    expect(summary.externalActionsBlocked).toEqual(['calendar.invite', 'gmail.send', 'drive.share']);
    expect(summary.notSignedConsentNotice).toContain('署名済み同意');
  });
});

function clearEvaluation(overrides: Partial<FamilyResponseEvaluation> = {}): FamilyResponseEvaluation {
  return {
    checkpointId: 'q1',
    checkpointTitle: '疾患部位（大動脈）',
    level: 'clear',
    score: 1,
    missingConcepts: [],
    redFlags: [],
    recommendedNextAction: 'continue',
    evidence: { matchedConcepts: ['大動脈'], sanitizedResponse: '大動脈' },
    ...overrides,
  };
}

const agreeingIntent: ConsentIntentRecord = {
  statedIntent: 'agrees',
  confidence: 'high',
  freeTextSummary: '',
  questionsForPhysician: [],
};

describe('deriveConsentDecision', () => {
  it('returns consent_ready when understanding is clear, intent agrees, and no unresolved questions', () => {
    const result = deriveConsentDecision({
      evaluations: [clearEvaluation(), clearEvaluation({ checkpointId: 'q2', checkpointTitle: '緊急性' })],
      intent: agreeingIntent,
    });

    expect(result.decision).toBe('consent_ready');
    expect(result.reasons).toHaveLength(0);
    expect(result.unresolvedQuestions).toHaveLength(0);
  });

  it('requires physician follow-up when understanding is partial', () => {
    const result = deriveConsentDecision({
      evaluations: [clearEvaluation(), clearEvaluation({ checkpointId: 'q2', checkpointTitle: '主なリスク', level: 'partial', recommendedNextAction: 'reexplain' })],
      intent: agreeingIntent,
    });

    expect(result.decision).toBe('needs_physician_followup');
    expect(result.reasons.join()).toContain('主なリスク');
  });

  it('requires physician follow-up on red-flag/unsafe responses', () => {
    const result = deriveConsentDecision({
      evaluations: [clearEvaluation({ level: 'unsafe', redFlags: ['怖い'], recommendedNextAction: 'escalate_to_physician' })],
      intent: agreeingIntent,
    });

    expect(result.decision).toBe('needs_physician_followup');
    expect(result.reasons.join()).toContain('強い不安');
  });

  it('requires physician follow-up when intent is undecided or declines', () => {
    for (const statedIntent of ['undecided', 'declines'] as const) {
      const result = deriveConsentDecision({
        evaluations: [clearEvaluation()],
        intent: { ...agreeingIntent, statedIntent },
      });
      expect(result.decision).toBe('needs_physician_followup');
    }
  });

  it('requires physician follow-up when questions could not be answered from selected evidence', () => {
    const result = deriveConsentDecision({
      evaluations: [clearEvaluation()],
      intent: agreeingIntent,
      escalatedQuestions: ['父の個別の生存率を教えてください'],
    });

    expect(result.decision).toBe('needs_physician_followup');
    expect(result.unresolvedQuestions).toContain('父の個別の生存率を教えてください');
  });

  it('requires physician follow-up when no understanding evaluation exists', () => {
    const result = deriveConsentDecision({ evaluations: [], intent: agreeingIntent });
    expect(result.decision).toBe('needs_physician_followup');
  });

  it('collects family questions for the physician as unresolved items', () => {
    const result = deriveConsentDecision({
      evaluations: [clearEvaluation()],
      intent: { ...agreeingIntent, questionsForPhysician: ['手術は何時間かかりますか'] },
    });

    expect(result.decision).toBe('needs_physician_followup');
    expect(result.unresolvedQuestions).toContain('手術は何時間かかりますか');
  });
});

describe('detectRedFlags', () => {
  it('detects anxiety terms and returns empty for calm text', () => {
    expect(detectRedFlags('とても怖いです。死ぬのではないかと心配です。').length).toBeGreaterThan(0);
    expect(detectRedFlags('説明はよく理解できました。')).toHaveLength(0);
  });
});

describe('buildConsentExplanationRecord', () => {
  it('outputs an anonymous auditable consent explanation record', () => {
    const checkpoints = buildAorticDissectionCheckpoints();
    const evaluations = [evaluateFamilyResponse(checkpoints[0], '大動脈が裂けて破裂の危険があります。')];
    const intent: ConsentIntentRecord = {
      statedIntent: 'agrees',
      confidence: 'medium',
      freeTextSummary: '説明内容は理解したが最終確認は医師にお願いしたい。',
      questionsForPhysician: ['脳梗塞のリスクを確認したい'],
    };

    const record = buildConsentExplanationRecord({
      evaluations,
      intent,
      generatedAt: '2026-05-30T00:00:00.000Z',
      modelMode: 'mock',
    });
    const serialized = JSON.stringify(record);

    expect(record.recordType).toBe('demo_consent_explanation_record');
    expect(record.caseId).toBe('demo-aortic-dissection');
    expect(record.patientHandle).toBe('demo-anonymous-case');
    expect(record.physicianReviewRequired).toBe(true);
    expect(record.externalActionsBlocked).toEqual(['calendar.invite', 'gmail.send', 'drive.share']);
    expect(record.generatedAt).toBe('2026-05-30T00:00:00.000Z');
    expect(serialized).not.toContain('family@example.com');
    expect(serialized).not.toContain('MRN-');
    expect(serialized).not.toContain('山田太郎');
  });
});
