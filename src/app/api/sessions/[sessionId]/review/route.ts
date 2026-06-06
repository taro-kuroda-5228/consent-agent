import { NextRequest, NextResponse } from 'next/server';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';
import { NOT_SIGNED_CONSENT_NOTICE } from '@/lib/repositories/consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, context: Params) {
  const { sessionId } = await context.params;
  const body = await req.json();
  const repository = createDefaultConsentSessionRepository();
  const review = await repository.savePhysicianReview({
    sessionId,
    reviewStatus: body.reviewStatus ?? 'needs_followup',
    physicianNotes: typeof body.physicianNotes === 'string' ? body.physicianNotes : undefined,
    notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE,
  });
  await repository.appendAuditEvent({ sessionId, action: 'physician_reviewed', resourceType: 'physician_review', resourceId: review.id, metadata: { reviewStatus: review.reviewStatus } });
  return NextResponse.json({ review, notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE });
}
