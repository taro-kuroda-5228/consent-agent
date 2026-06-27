import { describe, expect, it } from 'vitest';
import { createGeminiExplanationAdapter, mockGeminiExplanationAdapter } from '../gemini-explanation-adapter';

describe('mockGeminiExplanationAdapter', () => {
  it('returns deterministic PHI-free mock explanations for known checkpoints', async () => {
    const output = await mockGeminiExplanationAdapter.generateExplanation({
      caseId: 'demo-aortic-dissection',
      checkpointId: 'disease-mechanism',
      audience: 'patient_family',
      language: 'ja',
    });

    expect(output.mode).toBe('mock');
    expect(output.model).toBe('gemini-3.5-flash');
    expect(output.model).not.toContain('pro');
    expect(output.experience).toBe('gemini-explanation');
    expect(output.modalities).toEqual(['text', 'video', 'audio']);
    expect(output.spokenText).toContain('大動脈');
    expect(output.textSummary).toContain('大動脈');
    expect(output.videoStoryboard).toContain('大動脈');
    expect(output.audioNarration).toContain('大動脈');
    expect(output.visualCue).toContain('大動脈');
    expect(output.followUpPrompt).toContain('ご自身の言葉');
    expect(output.safetyNote).toBe('疑問が残る場合は次の質問・理解確認画面で記載してください。');
    expect(JSON.stringify(output)).not.toContain('AIは');
    expect(JSON.stringify(output)).not.toContain('一般的な説明');
    expect(JSON.stringify(output)).not.toContain('family@example.com');
    expect(JSON.stringify(output)).not.toContain('MRN-');
  });

  it('falls back to mock mode when no Gemini API key or backend endpoint exists', async () => {
    const adapter = createGeminiExplanationAdapter({ geminiApiKey: undefined, backendEndpoint: undefined });
    const output = await adapter.generateExplanation({
      caseId: 'demo-aortic-dissection',
      checkpointId: 'procedure-and-risks',
      audience: 'patient_family',
      language: 'ja',
    });

    expect(output.mode).toBe('mock');
    expect(output.safetyNote).toBe('疑問が残る場合は次の質問・理解確認画面で記載してください。');
    expect(output.spokenText).toContain('全弓部置換＋FET');
  });
});
