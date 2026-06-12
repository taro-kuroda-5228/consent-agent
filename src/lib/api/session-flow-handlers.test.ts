import { beforeEach, describe, expect, it } from 'vitest';
import { handleExplainRequest } from './explain-handler';
import { handleQaRequest } from './qa-handler';
import { handleSessionViewRequest, type FamilySessionView } from './session-view-handler';
import { handleFamilyResponseRequest, type FamilyResponseResult } from './family-response-handler';
import { handleDoctorSummaryRequest, type DoctorSummaryView } from './doctor-summary-handler';
import {
  inMemoryConsentSessionRepository,
  resetInMemoryConsentSessionRepository,
} from '../repositories/in-memory-consent-session-repository';
import { getUnderstandingQuestions } from '../understanding-checks';

const repository = inMemoryConsentSessionRepository;

async function createSession(): Promise<string> {
  const result = await handleExplainRequest(
    {
      diagnosis: 'Stanford A型急性大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      risks: ['死亡', '脳梗塞', '出血'],
      urgency: '緊急',
    },
    repository,
  );
  expect(result.status).toBe(200);
  const body = result.body as { sessionId: string };
  return body.sessionId;
}

function allCorrectAnswers() {
  return getUnderstandingQuestions().map((question) => ({
    questionId: question.id,
    selectedIndex: question.correctIndex,
  }));
}

beforeEach(() => {
  resetInMemoryConsentSessionRepository();
});

describe('GET session view (family)', () => {
  it('returns explanation cards, evidence, and understanding questions for a real session', async () => {
    const sessionId = await createSession();
    const result = await handleSessionViewRequest(sessionId, repository);

    expect(result.status).toBe(200);
    const view = result.body as FamilySessionView;
    expect(view.sessionId).toBe(sessionId);
    expect(view.explanation.length).toBeGreaterThan(0);
    expect(view.evidence.length).toBeGreaterThan(0);
    expect(view.understandingQuestions).toHaveLength(4);
    expect(view.intent).toBeNull();
  });

  it('returns 404 for an unknown session', async () => {
    const result = await handleSessionViewRequest('session-does-not-exist', repository);
    expect(result.status).toBe(404);
  });
});

describe('POST family responses', () => {
  it('persists evaluations and intent, and reaches consent_ready when all is clear', async () => {
    const sessionId = await createSession();
    const result = await handleFamilyResponseRequest(
      sessionId,
      { answers: allCorrectAnswers(), concerns: '', intent: 'agrees' },
      repository,
    );

    expect(result.status).toBe(200);
    const body = result.body as FamilyResponseResult;
    expect(body.decision.decision).toBe('consent_ready');

    const summary = await repository.getSessionSummary(sessionId);
    expect(summary?.evaluations).toHaveLength(4);
    expect(summary?.events.some((event) => event.eventType === 'intent_recorded')).toBe(true);
    expect(summary?.events.some((event) => event.eventType === 'family_response')).toBe(true);
  });

  it('requires physician follow-up when an answer is wrong', async () => {
    const sessionId = await createSession();
    const answers = allCorrectAnswers();
    answers[0] = { ...answers[0], selectedIndex: (answers[0].selectedIndex + 1) % 4 };

    const result = await handleFamilyResponseRequest(sessionId, { answers, intent: 'agrees' }, repository);
    const body = result.body as FamilyResponseResult;

    expect(body.decision.decision).toBe('needs_physician_followup');
    expect(body.decision.reasons.join()).toContain('理解が不十分');
  });

  it('escalates red-flag concerns to the physician', async () => {
    const sessionId = await createSession();
    const result = await handleFamilyResponseRequest(
      sessionId,
      { answers: allCorrectAnswers(), concerns: 'とても怖いです。必ず助かりますか。', intent: 'agrees' },
      repository,
    );
    const body = result.body as FamilyResponseResult;

    expect(body.decision.decision).toBe('needs_physician_followup');
    expect(body.evaluations.some((evaluation) => evaluation.level === 'unsafe')).toBe(true);
  });

  it('escalates when the AI concerns assessment flags anxiety that keywords missed', async () => {
    const sessionId = await createSession();
    const result = await handleFamilyResponseRequest(
      sessionId,
      // キーワード(怖い/死ぬ等)を含まない曖昧な不安表現
      { answers: allCorrectAnswers(), concerns: '本当にこれでよいのか、夜も眠れません。', intent: 'agrees' },
      repository,
      {
        concernsAssessor: async () => ({
          escalate: true,
          anxietyLevel: 'high',
          reasons: ['強い不安と決断への迷いを示している'],
        }),
      },
    );
    const body = result.body as FamilyResponseResult;

    expect(body.decision.decision).toBe('needs_physician_followup');
    expect(body.evaluations.some((evaluation) => evaluation.checkpointId === 'family-concerns-ai' && evaluation.level === 'unsafe')).toBe(true);
  });

  it('does not escalate administrative concerns when the AI assessment clears them', async () => {
    const sessionId = await createSession();
    const result = await handleFamilyResponseRequest(
      sessionId,
      { answers: allCorrectAnswers(), concerns: '', intent: 'agrees' },
      repository,
      {
        concernsAssessor: async () => {
          throw new Error('assessor must not be called for empty concerns');
        },
      },
    );
    const body = result.body as FamilyResponseResult;
    expect(body.decision.decision).toBe('consent_ready');
  });

  it('treats undecided intent as needs_physician_followup', async () => {
    const sessionId = await createSession();
    const result = await handleFamilyResponseRequest(
      sessionId,
      { answers: allCorrectAnswers(), intent: 'undecided' },
      repository,
    );
    const body = result.body as FamilyResponseResult;
    expect(body.decision.decision).toBe('needs_physician_followup');
  });

  it('rejects invalid input and unknown sessions', async () => {
    const sessionId = await createSession();
    const invalid = await handleFamilyResponseRequest(
      sessionId,
      { answers: [], intent: 'maybe' as never },
      repository,
    );
    expect(invalid.status).toBe(400);

    const missing = await handleFamilyResponseRequest(
      'session-does-not-exist',
      { answers: allCorrectAnswers(), intent: 'agrees' },
      repository,
    );
    expect(missing.status).toBe(404);
  });
});

describe('GET doctor summary', () => {
  it('builds a physician summary from real session data including escalated questions', async () => {
    const sessionId = await createSession();

    await handleQaRequest(
      {
        question: '父の個別の生存確率を教えてください',
        diagnosis: 'Stanford A型急性大動脈解離',
        plannedSurgery: '上行大動脈人工血管置換術',
        sessionId,
      },
      repository,
    );

    const answers = allCorrectAnswers();
    answers[1] = { ...answers[1], selectedIndex: (answers[1].selectedIndex + 1) % 4 };
    await handleFamilyResponseRequest(
      sessionId,
      { answers, concerns: '手術時間がどのくらいか医師に確認したい', intent: 'undecided' },
      repository,
    );

    const result = await handleDoctorSummaryRequest(sessionId, repository);
    expect(result.status).toBe(200);
    const view = result.body as DoctorSummaryView;

    expect(view.understood.length).toBe(3);
    expect(view.notUnderstood.length).toBeGreaterThan(0);
    expect(view.understandingScore).toEqual({ correct: 3, total: 4 });
    expect(view.consentDecision?.decision).toBe('needs_physician_followup');
    expect(view.doctorQuestions.join()).toContain('手術時間');
    expect(view.suggestedScript.length).toBeGreaterThan(0);
    expect(view.notSignedConsentNotice).toContain('署名済み同意');
  });

  it('returns 404 for an unknown session', async () => {
    const result = await handleDoctorSummaryRequest('session-does-not-exist', repository);
    expect(result.status).toBe(404);
  });
});
