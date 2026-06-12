import { NextRequest, NextResponse } from "next/server";
import { handleQaRequest } from "@/lib/api/qa-handler";
import { checkFamilyAccess, isFamilyTokenEnforced } from "@/lib/family-access-token";
import { createDefaultConsentSessionRepository } from "@/lib/repositories/default-consent-session-repository";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // 家族リンク経由（sessionId + familyToken）のアクセスはトークンを検証する。
  // 医師コンソールからの利用（トークン無し）は、本番運用では医師認証で別途保護する。
  if (isFamilyTokenEnforced() && body.sessionId && body.familyToken !== undefined) {
    const access = checkFamilyAccess(body.sessionId, typeof body.familyToken === "string" ? body.familyToken : null);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }
  const result = await handleQaRequest(body, createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
