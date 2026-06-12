import { NextRequest, NextResponse } from 'next/server';
import { handleFamilyResponseRequest } from '@/lib/api/family-response-handler';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, context: Params) {
  const { sessionId } = await context.params;
  const result = await handleFamilyResponseRequest(sessionId, await req.json(), createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
