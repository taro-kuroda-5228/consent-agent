import { NextRequest, NextResponse } from "next/server";
import { createAutoPhysicianUrlEvidence } from "../../../../lib/consent-demo";
import {
  extractPdfText,
  fetchSourceUrl,
  normalizePhysicianSourceUrl,
  selectRelevantEvidenceText,
} from "../../../../lib/source-url-evidence";
import { inspectEvidenceUploadText } from "../../../../lib/storage/evidence-upload";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

export { normalizePhysicianSourceUrl };

function isKnownPublicGuidelineUrl(sourceUrl: string): boolean {
  const normalized = sourceUrl.toLowerCase();
  return normalized.includes("j-circ.or.jp") && normalized.includes("jcs2020_ogino.pdf");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const rawSourceUrl = String(form.get("sourceUrl") || "").trim();
    const sourceUrl = rawSourceUrl ? normalizePhysicianSourceUrl(rawSourceUrl) : "";

    if (!(file instanceof File) && !sourceUrl) {
      return NextResponse.json({ error: "file or sourceUrl is required" }, { status: 400 });
    }

    let buffer: Buffer;
    let fileName: string;
    let fileSize: number;
    let fileType: string;

    if (file instanceof File) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "file is too large", maxBytes: MAX_UPLOAD_BYTES }, { status: 413 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
    } else {
      const fetched = await fetchSourceUrl(sourceUrl);
      buffer = fetched.buffer;
      fileName = fetched.fileName;
      fileSize = buffer.byteLength;
      fileType = fetched.contentType;
    }

    let extractedText = "";
    let extractionStatus: "extracted" | "needs-manual-review" = "needs-manual-review";
    let warning: string | undefined;

    if (fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      try {
        extractedText = selectRelevantEvidenceText(await extractPdfText(buffer));
        extractionStatus = extractedText ? "extracted" : "needs-manual-review";
        if (!extractedText) {
          warning = "PDFからテキストを抽出できませんでした。スキャンPDFの場合は医師が本文/要約を貼り付けてください。";
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("PDF extraction failed:", message);
        warning = `PDF抽出に失敗しました: ${message}。医師が本文/要約を貼り付けて確認してください。`;
      }
    } else if (fileType.startsWith("text/") || fileName.toLowerCase().endsWith(".txt")) {
      extractedText = selectRelevantEvidenceText(buffer.toString("utf8"));
      extractionStatus = extractedText ? "extracted" : "needs-manual-review";
    } else {
      warning = "PDFまたはテキストファイルのみを対象にしています。本文を手入力してください。";
    }

    const evidenceCard = sourceUrl && extractedText
      ? createAutoPhysicianUrlEvidence({ sourceUrl, fileName, extractedText })
      : undefined;

    const shouldInspectPhi = !(sourceUrl && isKnownPublicGuidelineUrl(sourceUrl));
    const phiInspection = shouldInspectPhi ? inspectEvidenceUploadText(extractedText || fileName) : { allowed: true as const, sanitizedText: extractedText || fileName };
    if (phiInspection.allowed === false) {
      return NextResponse.json({
        error: "PHI-like content blocked for anonymous demo upload",
        category: phiInspection.category,
        risk: phiInspection.risk,
        nextChoices: phiInspection.nextChoices,
        sanitizedSample: phiInspection.sanitizedSample,
      }, { status: 422 });
    }

    return NextResponse.json({
      fileName,
      fileSize,
      sourceUrl: sourceUrl || undefined,
      extractionStatus,
      extractedText,
      evidenceCard,
      warning,
      privacyNote: "アップロード本文はこのデモでは永続保存せず、このリクエスト内で抽出して医師確認用に返します。PHI/PIIを含む資料は使わないでください。",
    });
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: "Failed to process uploaded evidence" }, { status: 500 });
  }
}
