import { NextResponse } from 'next/server';
import { buildAnonymousConsentRecordExport } from '@/lib/export/consent-record-export';
import { createDefaultConsentSessionRepository } from '@/lib/repositories/default-consent-session-repository';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, context: Params) {
  const { sessionId } = await context.params;
  const repository = createDefaultConsentSessionRepository();
  const summary = await repository.getSessionSummary(sessionId);
  if (!summary) return NextResponse.json({ error: 'session not found' }, { status: 404 });
  const exported = buildAnonymousConsentRecordExport(summary);
  await repository.appendSessionEvent({ sessionId, eventType: 'export_created', actorType: 'system', payload: { selectedEvidenceIds: exported.selectedEvidenceIds, phiHandling: exported.phiHandling } });
  await repository.appendAuditEvent({ sessionId, action: 'export_created', resourceType: 'consent_export', metadata: { selectedEvidenceIds: exported.selectedEvidenceIds, phiHandling: exported.phiHandling } });
  return NextResponse.json(exported);
}
