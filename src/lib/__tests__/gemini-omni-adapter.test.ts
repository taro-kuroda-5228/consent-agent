import { describe, expect, it } from 'vitest';
import { createGeminiOmniAdapter, mockGeminiOmniAdapter } from '../gemini-omni-adapter';

describe('mockGeminiOmniAdapter', () => {
  it('returns deterministic PHI-free mock explanations for known checkpoints', async () => {
    const output = await mockGeminiOmniAdapter.generateExplanation({
      caseId: 'demo-aortic-dissection',
      checkpointId: 'disease-mechanism',
      audience: 'patient_family',
      language: 'ja',
    });

    expect(output.mode).toBe('mock');
    expect(output.spokenText).toContain('大動脈');
    expect(output.visualCue).toContain('大動脈');
    expect(output.followUpPrompt).toContain('ご自身の言葉');
    expect(output.safetyNote).toContain('デモ用');
    expect(JSON.stringify(output)).not.toContain('family@example.com');
    expect(JSON.stringify(output)).not.toContain('MRN-');
  });

  it('falls back to mock mode when no Gemini API key or backend endpoint exists', async () => {
    const adapter = createGeminiOmniAdapter({ geminiApiKey: undefined, backendEndpoint: undefined });
    const output = await adapter.generateExplanation({
      caseId: 'demo-aortic-dissection',
      checkpointId: 'procedure-and-risks',
      audience: 'patient_family',
      language: 'ja',
    });

    expect(output.mode).toBe('mock');
    expect(output.safetyNote).toContain('医師確認');
  });
});
