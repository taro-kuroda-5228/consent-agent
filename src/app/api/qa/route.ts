import { NextRequest, NextResponse } from "next/server";
import { generateQA } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, diagnosis, plannedSurgery, risks } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const result = await generateQA(question, {
      diagnosis: diagnosis || "",
      plannedSurgery: plannedSurgery || "",
      risks: risks || [],
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
