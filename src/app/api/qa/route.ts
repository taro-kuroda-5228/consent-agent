import { NextRequest, NextResponse } from "next/server";
import { generateQA } from "@/lib/gemini";
import {
  resolveEvidenceSelectionForRequest,
  retrieveMockEvidence,
  type EvidenceCard,
} from "@/lib/consent-demo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, diagnosis, plannedSurgery, risks, selectedEvidenceIds, customEvidence, facilityAnswerTemplates } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const physicianUploadedEvidence: EvidenceCard[] = Array.isArray(customEvidence)
      ? customEvidence.filter((item) => item?.origin === "physician-upload" && item?.evidenceId && item?.displayForFamily)
      : [];
    const selectedEvidence = resolveEvidenceSelectionForRequest(
      [...retrieveMockEvidence(diagnosis || ""), ...physicianUploadedEvidence],
      selectedEvidenceIds,
    );

    const result = await generateQA(question, {
      diagnosis: diagnosis || "",
      plannedSurgery: plannedSurgery || "",
      risks: risks || [],
      selectedEvidence,
      facilityAnswerTemplates: Array.isArray(facilityAnswerTemplates) ? facilityAnswerTemplates : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Q&A generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate answer", details: String(error) },
      { status: 500 }
    );
  }
}
