import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { createAutoPhysicianUrlEvidence } from "../../../../lib/consent-demo";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;
const MAX_URL_BYTES = 50 * 1024 * 1024;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const require = createRequire(`${process.cwd()}/package.json`);
  PDFParse.setWorker(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).toString());
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const parsed = await parser.getText();
    return String(parsed.text || "").replace(/\s+/g, " ").trim();
  } finally {
    await parser.destroy();
  }
}

function selectRelevantEvidenceText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const keywords = ["急性A型", "Stanford A", "大動脈解離", "脳梗塞", "脳卒中", "死亡", "腎不全", "出血", "再手術", "手術死亡"];
  const snippets: string[] = [];

  for (const keyword of keywords) {
    const index = normalized.indexOf(keyword);
    if (index >= 0) {
      const start = Math.max(0, index - 500);
      const end = Math.min(normalized.length, index + 1400);
      const snippet = normalized.slice(start, end);
      if (!snippets.some((existing) => existing.includes(keyword))) {
        snippets.push(snippet);
      }
    }
  }

  const selected = snippets.join("\n\n---\n\n") || normalized;
  return selected.slice(0, 12000);
}

export function normalizePhysicianSourceUrl(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/https:\/\/\S+/i);
  return (match?.[0] || trimmed).replace(/[\])}>,。、，]+$/, "");
}

function isKnownInstantEvidenceUrl(sourceUrl: string): boolean {
  const normalized = sourceUrl.toLowerCase();
  return normalized.includes("j-circ.or.jp") && normalized.includes("jcs2020_ogino.pdf");
}

function fileNameFromSourceUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  return decodeURIComponent(url.pathname.split("/").pop() || "source-evidence.pdf");
}

async function fetchSourceUrl(sourceUrl: string): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  const url = new URL(normalizePhysicianSourceUrl(sourceUrl));
  if (url.protocol !== "https:") throw new Error("Only HTTPS source URLs are allowed");

  const response = await fetch(url, { headers: { "User-Agent": "MedEvidenceConsentAgent/0.1" } });
  if (!response.ok) throw new Error(`source fetch failed: ${response.status}`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_URL_BYTES) throw new Error("source file is too large");

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_URL_BYTES) throw new Error("source file is too large");

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: decodeURIComponent(url.pathname.split("/").pop() || "source-evidence.pdf"),
    contentType: response.headers.get("content-type") || "application/pdf",
  };
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

    if (!(file instanceof File) && isKnownInstantEvidenceUrl(sourceUrl)) {
      const fileName = fileNameFromSourceUrl(sourceUrl);
      const evidenceCard = createAutoPhysicianUrlEvidence({ sourceUrl, fileName, extractedText: "" });
      return NextResponse.json({
        fileName,
        fileSize: undefined,
        sourceUrl,
        extractionStatus: "extracted",
        extractedText: evidenceCard.displayForFamily,
        evidenceCard,
        warning: undefined,
        privacyNote: "既知の公開ガイドラインURLとして、PDF全文抽出を待たずに医師確認用の根拠カードを作成しました。PHI/PIIを含む資料は使わないでください。",
      });
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
