import { NextRequest, NextResponse } from 'next/server';
import { handleFamilyResponseRequest } from '@/lib/api/family-response-handler';
import { checkFamilyAccess } from '@/lib/family-access-token';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, context: Params) {
  const { sessionId } = await context.params;
  const body = await req.json();
  const access = checkFamilyAccess(sessionId, typeof body.familyToken === 'string' ? body.familyToken : null);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const result = await handleFamilyResponseRequest(sessionId, body, createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
