import { NextRequest, NextResponse } from "next/server";
import { handleQaRequest } from "@/lib/api/qa-handler";
import { checkFamilyAccess, isFamilyTokenEnforced } from "@/lib/family-access-token";
import { createDefaultConsentSessionRepository } from "@/lib/repositories/default-consent-session-repository";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // リンク秘密鍵が設定された運用では、セッション付きQAは必ずトークンを検証する
  // （トークン省略によるバイパスを許さない fail-close）。医師コンソールも発行済みトークンを送る。
  if (isFamilyTokenEnforced() && body.sessionId) {
    const access = checkFamilyAccess(body.sessionId, typeof body.familyToken === "string" ? body.familyToken : null);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }
  const result = await handleQaRequest(body, createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
