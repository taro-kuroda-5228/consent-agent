import { describe, expect, it } from 'vitest';
import { parseSampleRate, pcm16ToWav, TTS_GEMINI_MODEL, TTS_MAX_TEXT_LENGTH } from './tts';

describe('pcm16ToWav', () => {
  it('wraps PCM data with a valid RIFF/WAVE header', () => {
    const pcm = Buffer.alloc(1000, 7);
    const wav = pcm16ToWav(pcm, 24000);

    expect(wav.length).toBe(44 + 1000);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(wav.readUInt32LE(40)).toBe(1000); // data size
    expect(wav.subarray(44).equals(pcm)).toBe(true);
  });
});

describe('parseSampleRate', () => {
  it('parses the rate from the Gemini TTS mime type', () => {
    expect(parseSampleRate('audio/L16;codec=pcm;rate=24000')).toBe(24000);
    expect(parseSampleRate('audio/L16;codec=pcm;rate=16000')).toBe(16000);
    expect(parseSampleRate(undefined)).toBe(24000);
  });
});

describe('tts limits', () => {
  it('keeps narration text within a family-friendly length cap', () => {
    expect(TTS_MAX_TEXT_LENGTH).toBeLessThanOrEqual(1000);
  });

  it('uses a Gemini 3 or newer TTS model id', () => {
    expect(TTS_GEMINI_MODEL).toBe('gemini-3.1-flash-tts-preview');
    expect(TTS_GEMINI_MODEL).toMatch(/^gemini-3/);
    expect(TTS_GEMINI_MODEL).not.toContain('pro');
  });
});
