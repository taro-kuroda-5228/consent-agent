import { beforeEach, describe, expect, it } from 'vitest';
import { handleExplainRequest } from './explain-handler';
import { handleQaRequest } from './qa-handler';
import { InMemoryConsentSessionRepository, resetInMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';

describe('explain and qa handlers persistence', () => {
  beforeEach(() => resetInMemoryConsentSessionRepository());

  it('creates a persisted session and audit event from explain', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const result = await handleExplainRequest({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術', selectedEvidenceIds: ['FAC-001'] }, repo);
    expect(result.status).toBe(200);
    expect(result.body.sessionId).toMatch(/^session-/);
    expect(result.body.auditEventId).toMatch(/^audit-/);
    const summary = await repo.getSessionSummary(String(result.body.sessionId));
    expect(summary?.selectedEvidence.map(e => e.evidenceId)).toEqual(['FAC-001']);
    expect(summary?.events[0].eventType).toBe('explanation_generated');
  });

  it('uses database-selected evidence over conflicting request evidence in QA', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const explained = await handleExplainRequest({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術', selectedEvidenceIds: ['AAD-004'] }, repo);
    const sessionId = String(explained.body.sessionId);
    const qa = await handleQaRequest({ sessionId, question: '長期的な予後は？', diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術', selectedEvidenceIds: ['FAC-001'] }, repo);
    expect(qa.status).toBe(200);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.metadata.warning).toContain('database state was used');
    expect(qa.body.evidenceReferences).toContain('AAD-004');
    const summary = await repo.getSessionSummary(sessionId);
    expect(summary?.events.map(e => e.eventType)).toContain('qa_answered');
  });
});
