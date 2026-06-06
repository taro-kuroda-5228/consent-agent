import { NextRequest, NextResponse } from "next/server";
import { searchPubMedEvidence } from "@/lib/pubmed-search";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const retmax = typeof body.retmax === "number" ? Math.max(1, Math.min(10, body.retmax)) : 5;

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const result = await searchPubMedEvidence(query, retmax);
    return NextResponse.json({
      mode: "pubmed-natural-language-evidence-search",
      sourcePolicy: "PubMed検索で候補を提示します。患者説明に引用できる根拠は医師が内容を確認して追加したものだけです。",
      ...result,
    });
  } catch (error) {
    console.error("PubMed evidence search error:", error);
    return NextResponse.json(
      { error: "Failed to search PubMed evidence", details: String(error) },
      { status: 500 },
    );
  }
}
