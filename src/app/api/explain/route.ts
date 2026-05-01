import { NextRequest, NextResponse } from "next/server";
import { generateExplanation } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diagnosis, plannedSurgery, risks, urgency, purpose, cardiopulmonaryBypass, transfusion, notes } = body;

    if (!diagnosis || !plannedSurgery) {
      return NextResponse.json(
        { error: "diagnosis and plannedSurgery are required" },
        { status: 400 }
      );
    }

    const explanation = await generateExplanation({
      diagnosis,
      plannedSurgery,
      risks: risks || [],
      urgency: urgency || "",
      purpose: purpose || "",
      cardiopulmonaryBypass: cardiopulmonaryBypass ?? false,
      transfusion: transfusion || "",
      notes: notes || "",
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Explanation generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation", details: String(error) },
      { status: 500 }
    );
  }
}
