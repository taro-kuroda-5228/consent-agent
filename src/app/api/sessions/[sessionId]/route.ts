import { NextRequest, NextResponse } from 'next/server';
import { handleSessionViewRequest } from '@/lib/api/session-view-handler';
import { checkFamilyAccess } from '@/lib/family-access-token';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, context: Params) {
  const { sessionId } = await context.params;
  const access = checkFamilyAccess(sessionId, req.nextUrl.searchParams.get('t'));
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const result = await handleSessionViewRequest(sessionId, createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
