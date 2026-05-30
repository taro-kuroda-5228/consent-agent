import { NextRequest, NextResponse } from "next/server";
import { retrieveMockEvidence, suggestEvidenceCandidates } from "@/lib/consent-demo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diagnosis, plannedSurgery, risks } = body;

    if (!diagnosis || !plannedSurgery) {
      return NextResponse.json(
        { error: "diagnosis and plannedSurgery are required" },
        { status: 400 },
      );
    }

    const evidence = retrieveMockEvidence(diagnosis);
    const suggestion = suggestEvidenceCandidates({
      diagnosis,
      plannedSurgery,
      risks: Array.isArray(risks) ? risks : [],
      evidence,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Evidence suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to suggest evidence candidates", details: String(error) },
      { status: 500 },
    );
  }
}
