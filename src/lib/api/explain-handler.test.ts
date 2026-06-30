import { beforeEach, describe, expect, it } from 'vitest';
import { handleExplainRequest } from './explain-handler';
import { handleQaRequest } from './qa-handler';
import { InMemoryConsentSessionRepository, resetInMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import { createPhysicianUploadedEvidence, type EvidenceCard } from '../consent-demo';

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
    if ('error' in qa.body) throw new Error(qa.body.error);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.metadata.warning).toContain('database state was used');
    expect(qa.body.evidenceReferences).toContain('AAD-004');
    const summary = await repo.getSessionSummary(sessionId);
    expect(summary?.events.map(e => e.eventType)).toContain('qa_answered');
  });

  it('answers persisted physician-selected evidence through source-bounded Q&A when Japanese wording differs from the English source terms', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術' });
    const uploaded = createPhysicianUploadedEvidence({
      title: 'Mesenteric malperfusion in acute type A aortic dissection',
      fileName: 'mesenteric-malperfusion.pdf',
      extractedText:
        'Preoperative malperfusion occurred in 27.7% of cases. Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).',
      keyFindings: [
        'Preoperative malperfusion occurred in 27.7% of cases.',
        'Mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).',
      ],
      outcomeTags: ['organ-malperfusion'],
    });
    await repo.saveSelectedEvidence({ sessionId: session.id, selectedEvidence: [uploaded] });

    const qa = await handleQaRequest({
      sessionId: session.id,
      question: '腸管虚血のリスクは？',
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      risks: ['腸管虚血'],
    }, repo);

    expect(qa.status).toBe(200);
    if ('error' in qa.body) throw new Error(qa.body.error);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.answer).not.toContain('直接答えられる記載が見つかりません');
    expect(qa.body.answer).toContain('27.7%');
    expect(qa.body.answer).toContain('OR 1.82');
    expect(qa.body.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(qa.body.supportingSpans?.[0]?.text).toContain('Mesenteric malperfusion');
  });

  it('answers persisted physician-selected non-numeric source statements through Q&A without prior knowledge', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術' });
    const uploaded = createPhysicianUploadedEvidence({
      title: 'Mesenteric malperfusion clinical consequences in acute type A dissection',
      fileName: 'mesenteric-malperfusion-consequences.pdf',
      extractedText:
        'Mesenteric malperfusion was associated with persistent metabolic acidosis and the need for bowel resection after acute type A dissection repair. The paper did not evaluate renal replacement therapy.',
      keyFindings: [
        'Mesenteric malperfusion was associated with persistent metabolic acidosis and the need for bowel resection after acute type A dissection repair.',
      ],
      outcomeTags: ['organ-malperfusion'],
    });
    await repo.saveSelectedEvidence({ sessionId: session.id, selectedEvidence: [uploaded] });

    const qa = await handleQaRequest({
      sessionId: session.id,
      question: '腸管虚血では何が問題になりますか？',
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      risks: ['腸管虚血'],
    }, repo);

    expect(qa.status).toBe(200);
    if ('error' in qa.body) throw new Error(qa.body.error);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.answer).not.toContain('直接答えられる記載が見つかりません');
    expect(qa.body.answer).toContain('persistent metabolic acidosis');
    expect(qa.body.answer).toContain('bowel resection');
    expect(qa.body.answer).not.toContain('renal replacement therapy');
    expect(qa.body.evidenceReferences).toEqual([uploaded.evidenceId]);
    expect(qa.body.supportingSpans?.[0]?.text).toContain('Mesenteric malperfusion');
  });

  it('does not let request-supplied PubMed evidence override persisted physician-selected session evidence', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const explained = await handleExplainRequest({
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      selectedEvidenceIds: ['FAC-001'],
    }, repo);
    const sessionId = String(explained.body.sessionId);
    const pubmedRenalEvidence: EvidenceCard = {
      evidenceId: 'PUBMED-36036431',
      title: 'Risk factors for acute kidney injury after Stanford type A aortic dissection repair surgery: a systematic review and meta-analysis.',
      sourceType: 'Review',
      claim: 'This PubMed candidate reviews AKI after TAAD repair, including synthesized incidence, risk factors, and mortality impact.',
      displayForFamily: '大動脈解離の術後に起こる急性腎障害（AKI）について、発生やリスク因子、死亡率への影響を解析したメタ解析です。',
      confidence: 'moderate',
      citation: 'Wang et al. Renal failure. 2022. PMID: 36036431',
      pmid: '36036431',
      origin: 'medevidence-rag',
      retrievalStatus: 'pubmed-verified',
      quotedSpan: 'The synthesized incidence of postoperative AKI was 50.7%. The synthesized incidence and risk factors of AKI and its impact on mortality were calculated.',
      sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/36036431/',
      clinicianSummary: '大動脈解離の透析リスクについて言及している論文に関連するPubMed候補。AKI after TAAD repair, incidence, risk factors, mortality impactを扱う。',
      keyFindings: [
        'The synthesized incidence of postoperative AKI was 50.7%.',
        'Risk factors for acute kidney injury (AKI) after Stanford type A aortic dissection (TAAD) repair are inconsistent in different studies.',
        'The synthesized incidence and risk factors of AKI and its impact on mortality were calculated.',
      ],
      outcomeTags: ['renal-failure', 'dialysis'],
      clinicalScope: '急性A型大動脈解離 / TAAD repair renal failure',
    };

    const qa = await handleQaRequest({
      sessionId,
      question: '透析のリスクは？',
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      risks: ['腎不全', '透析'],
      selectedEvidenceIds: ['FAC-001', 'PUBMED-36036431'],
      customEvidence: [pubmedRenalEvidence],
      facilityAnswerTemplates: [],
    }, repo);

    expect(qa.status).toBe(200);
    if ('error' in qa.body) throw new Error(qa.body.error);
    expect(qa.body.answer).not.toContain('50.7%');
    expect(qa.body.evidenceReferences).not.toContain('PUBMED-36036431');
    expect(qa.body.selectedEvidence.map((item: EvidenceCard) => item.evidenceId)).toEqual(['FAC-001']);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.metadata.warning).toContain('customEvidence was ignored');
  });

  it('does not use request customEvidence when a persisted session intentionally has no selected evidence', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const explained = await handleExplainRequest({
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      selectedEvidenceIds: [],
    }, repo);
    const sessionId = String(explained.body.sessionId);
    const pubmedRenalEvidence: EvidenceCard = {
      evidenceId: 'PUBMED-36036431',
      title: 'Synthetic PubMed candidate for AKI after TAAD repair',
      sourceType: 'Review',
      claim: 'This request candidate should not be used for a persisted no-evidence session.',
      displayForFamily: '術後AKIについてのリクエスト候補です。',
      confidence: 'moderate',
      citation: 'Wang et al. Renal failure. 2022. PMID: 36036431',
      pmid: '36036431',
      origin: 'medevidence-rag',
      retrievalStatus: 'pubmed-verified',
      quotedSpan: 'The synthesized incidence of postoperative AKI was 50.7%.',
      keyFindings: ['The synthesized incidence of postoperative AKI was 50.7%.'],
      outcomeTags: ['renal-failure', 'dialysis'],
    };

    const qa = await handleQaRequest({
      sessionId,
      question: '透析のリスクは？',
      diagnosis: '急性A型大動脈解離',
      plannedSurgery: '上行大動脈人工血管置換術',
      risks: ['腎不全', '透析'],
      selectedEvidenceIds: ['PUBMED-36036431'],
      customEvidence: [pubmedRenalEvidence],
    }, repo);

    expect(qa.status).toBe(200);
    if ('error' in qa.body) throw new Error(qa.body.error);
    expect(qa.body.answer).not.toContain('50.7%');
    expect(qa.body.evidenceReferences).not.toContain('PUBMED-36036431');
    expect(qa.body.selectedEvidence).toEqual([]);
    expect(qa.body.metadata.selectedEvidenceSource).toBe('database');
    expect(qa.body.metadata.warning).toContain('persisted physician-selected evidence was empty');
  });
});
