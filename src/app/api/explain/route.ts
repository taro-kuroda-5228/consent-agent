import { NextRequest, NextResponse } from "next/server";
import { handleExplainRequest } from "@/lib/api/explain-handler";
import { createDefaultConsentSessionRepository } from "@/lib/repositories/default-consent-session-repository";

export async function POST(req: NextRequest) {
  const result = await handleExplainRequest(await req.json(), createDefaultConsentSessionRepository());
  return NextResponse.json(result.body, { status: result.status });
}
