import { NextRequest, NextResponse } from 'next/server';
import { approveEvidenceForSession } from '@/lib/evidence-approval';
import { inMemoryConsentSessionRepository } from '@/lib/repositories/in-memory-consent-session-repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.sessionId || !body.evidence) {
      return NextResponse.json({ error: 'sessionId and evidence are required' }, { status: 400 });
    }
    const result = await approveEvidenceForSession({ sessionId: body.sessionId, evidence: body.evidence }, inMemoryConsentSessionRepository);
    return NextResponse.json({ mode: 'physician-curated-evidence-approval', ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to approve evidence', details: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
