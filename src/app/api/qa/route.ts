import { NextRequest, NextResponse } from "next/server";
import { handleQaRequest } from "@/lib/api/qa-handler";
import { createDefaultConsentSessionRepository } from "@/lib/repositories/default-consent-session-repository";

export async function POST(req: NextRequest) {
  const result = await handleQaRequest(await req.json(), createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
