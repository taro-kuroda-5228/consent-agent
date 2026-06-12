import { NextResponse } from 'next/server';
import { handleSessionViewRequest } from '@/lib/api/session-view-handler';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, context: Params) {
  const { sessionId } = await context.params;
  const result = await handleSessionViewRequest(sessionId, createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
