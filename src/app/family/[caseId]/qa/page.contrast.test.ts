import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/family/[caseId]/qa/page.tsx', 'utf8');

describe('family QA page visual contrast', () => {
  it('does not inherit the global dark-theme white foreground on the light family QA screen', () => {
    expect(source).toContain('min-h-screen bg-slate-50 text-slate-900');
    expect(source).toContain('const familyQaCardClass');
    expect(source).toContain('bg-white text-slate-900');
  });

  it('keeps family question controls readable on white cards', () => {
    expect(source).toContain('text-slate-900 hover:bg-blue-50');
    expect(source).toContain('bg-white text-slate-900 placeholder:text-slate-500');
    expect(source).toContain('bg-white border-gray-200 text-slate-900 hover:bg-gray-50');
  });

  it('keeps speech recognition detection out of the server/client first render', () => {
    expect(source).toContain('const startVoiceInput = () => {');
    expect(source).toContain('const SpeechRecognitionImpl = getSpeechRecognition();');
    expect(source).toContain('aria-label="音声で質問する"');
    expect(source).not.toContain('voiceSupported');
    expect(source).not.toContain('setVoiceSupported');
    expect(source).not.toContain('useState<boolean>(() => getSpeechRecognition() !== null)');
  });
});
