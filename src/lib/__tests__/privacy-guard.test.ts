import { describe, expect, it } from 'vitest';
import { demoConsentCase } from '../omni-demo-consent-case';
import { buildConsentExplanationRecord, buildAorticDissectionCheckpoints, evaluateFamilyResponse } from '../ai-consent-session';
import { createGeminiOmniAdapter } from '../gemini-omni-adapter';

describe('Consent Agent Vercel privacy guard', () => {
  it('keeps the demo case anonymous', () => {
    expect(demoConsentCase.patientDisplay).toContain('匿名');
    expect(JSON.stringify(demoConsentCase)).not.toContain('MRN-');
  });

  it('does not persist family contact or raw patient identifiers in the consent explanation record', () => {
    const [checkpoint] = buildAorticDissectionCheckpoints();
    const record = buildConsentExplanationRecord({
      evaluations: [evaluateFamilyResponse(checkpoint, '大動脈が裂けて破裂の危険があります。')],
      intent: {
        statedIntent: 'undecided',
        confidence: 'medium',
        freeTextSummary: '医師に最終確認したい。',
        questionsForPhysician: ['個別の生存可能性を確認したい'],
      },
      generatedAt: '2026-05-30T00:00:00.000Z',
      modelMode: 'mock',
    });
    const serialized = JSON.stringify(record);

    expect(record.patientHandle).toBe('demo-anonymous-case');
    expect(serialized).not.toContain('family@example.com');
    expect(serialized).not.toContain('山田太郎');
    expect(serialized).not.toContain('MRN-');
  });

  it('uses mock fallback without API credentials', async () => {
    const adapter = createGeminiOmniAdapter({});
    await expect(
      adapter.generateExplanation({
        caseId: 'demo-aortic-dissection',
        checkpointId: 'emergency-surgery-need',
        audience: 'patient_family',
        language: 'ja',
      }),
    ).resolves.toMatchObject({ mode: 'mock' });
  });
});
