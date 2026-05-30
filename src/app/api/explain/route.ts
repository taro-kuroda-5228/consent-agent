import { NextRequest, NextResponse } from "next/server";
import { generateExplanation } from "@/lib/gemini";
import {
  buildEvidenceTransparency,
  resolveEvidenceSelectionForRequest,
  retrieveMockEvidence,
  type EvidenceCard,
} from "@/lib/consent-demo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diagnosis, plannedSurgery, risks, urgency, purpose, cardiopulmonaryBypass, transfusion, notes, selectedEvidenceIds, customEvidence } = body;

    if (!diagnosis || !plannedSurgery) {
      return NextResponse.json(
        { error: "diagnosis and plannedSurgery are required" },
        { status: 400 }
      );
    }

    const physicianUploadedEvidence: EvidenceCard[] = Array.isArray(customEvidence)
      ? customEvidence.filter((item) => item?.origin === "physician-upload" && item?.evidenceId && item?.displayForFamily)
      : [];
    const selectedEvidence = resolveEvidenceSelectionForRequest(
      [...retrieveMockEvidence(diagnosis), ...physicianUploadedEvidence],
      selectedEvidenceIds,
    );
    const evidenceTransparency = buildEvidenceTransparency(selectedEvidence);

    const explanation = await generateExplanation({
      diagnosis,
      plannedSurgery,
      risks: risks || [],
      urgency: urgency || "",
      purpose: purpose || "",
      cardiopulmonaryBypass: cardiopulmonaryBypass ?? false,
      transfusion: transfusion || "",
      notes: notes || "",
      selectedEvidence,
    });

    return NextResponse.json({ explanation, selectedEvidence, evidenceTransparency });
  } catch (error) {
    console.error("Explanation generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation", details: String(error) },
      { status: 500 }
    );
  }
}
