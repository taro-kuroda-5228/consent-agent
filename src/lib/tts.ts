import { createGenAIClient, shouldUseLiveGemini } from './gemini';

// Gemini 3+ policy: narration uses the currently available Flash TTS route when live credentials are enabled.
export const TTS_GEMINI_MODEL = 'gemini-3.1-flash-tts-preview';
export const TTS_VOICE_NAME = 'Kore';
export const TTS_MAX_TEXT_LENGTH = 600;

/** PCM 16-bit mono を WAV コンテナに包む（ブラウザの Audio 要素で再生可能にする） */
export function pcm16ToWav(pcm: Buffer, sampleRate = 24000, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
  header.writeUInt16LE(channels * 2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function parseSampleRate(mimeType: string | undefined, fallback = 24000): number {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export type SpeechSynthesisResult = { wav: Buffer; sampleRate: number };

/**
 * 説明ナレーションを Gemini TTS で合成する。
 * ライブ資格情報が無い場合は null（クライアントは Web Speech API にフォールバック）。
 */
export async function synthesizeNarration(text: string): Promise<SpeechSynthesisResult | null> {
  if (!shouldUseLiveGemini()) return null;
  const trimmed = text.trim().slice(0, TTS_MAX_TEXT_LENGTH);
  if (!trimmed) return null;

  const response = await createGenAIClient().models.generateContent({
    model: TTS_GEMINI_MODEL,
    contents: [{ parts: [{ text: trimmed }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE_NAME } } },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  const base64 = part?.inlineData?.data;
  if (!base64) return null;
  const sampleRate = parseSampleRate(part?.inlineData?.mimeType);
  return { wav: pcm16ToWav(Buffer.from(base64, 'base64'), sampleRate), sampleRate };
}
