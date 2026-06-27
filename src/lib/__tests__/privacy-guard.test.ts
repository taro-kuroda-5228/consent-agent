import { describe, expect, it } from 'vitest';
import { demoConsentCase } from '../gemini-demo-consent-case';
import { buildConsentExplanationRecord, buildAorticDissectionCheckpoints, evaluateFamilyResponse, sanitizeClinicalFreeText } from '../ai-consent-session';
import { createGeminiExplanationAdapter } from '../gemini-explanation-adapter';

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
    const adapter = createGeminiExplanationAdapter({});
    await expect(
      adapter.generateExplanation({
        caseId: 'demo-aortic-dissection',
        checkpointId: 'emergency-surgery-need',
        audience: 'patient_family',
        language: 'ja',
      }),
    ).resolves.toMatchObject({ mode: 'mock' });
  });

  it('does not redact generic clinical wording such as 患者さん while still redacting names', () => {
    const sanitized = sanitizeClinicalFreeText('患者さんの状態を確認します。山田さんと黒田太郎 MRN-123456');

    expect(sanitized).toContain('患者さんの状態');
    expect(sanitized).not.toContain('山田さん');
    expect(sanitized).not.toContain('黒田太郎');
    expect(sanitized).not.toContain('MRN-123456');
  });
});
