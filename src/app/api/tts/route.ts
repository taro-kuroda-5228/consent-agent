import { NextRequest, NextResponse } from 'next/server';
import { synthesizeNarration } from '@/lib/tts';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  try {
    const result = await synthesizeNarration(text);
    if (!result) {
      // ライブTTSが使えない環境。クライアントは Web Speech API にフォールバックする。
      return NextResponse.json({ error: 'tts unavailable' }, { status: 503 });
    }
    return new NextResponse(new Uint8Array(result.wav), {
      status: 200,
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.warn('TTS synthesis failed; client should fall back to Web Speech API', error);
    return NextResponse.json({ error: 'tts failed' }, { status: 503 });
  }
}
