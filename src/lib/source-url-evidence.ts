import { createHash } from "node:crypto";
import { createAutoPhysicianUrlEvidence, type EvidenceCard } from "./consent-demo";
import type { ConsentSessionRepository, SourceDocumentChunkRecord } from "./repositories/consent-session-repository";

export const MAX_SOURCE_URL_BYTES = 50 * 1024 * 1024;

export function normalizePhysicianSourceUrl(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/https:\/\/\S+/i);
  return (match?.[0] || trimmed).replace(/[\])}>,。、，]+$/, "");
}

function isLikelyPdf(fileName: string, contentType: string): boolean {
  return contentType.includes("application/pdf") || fileName.toLowerCase().endsWith(".pdf");
}

class PdfDomMatrixPolyfill {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  is2D = true;

  constructor(init?: number[] | string) {
    const values = Array.isArray(init) ? init : [1, 0, 0, 1, 0, 0];
    this.a = Number(values[0] ?? 1);
    this.b = Number(values[1] ?? 0);
    this.c = Number(values[2] ?? 0);
    this.d = Number(values[3] ?? 1);
    this.e = Number(values[4] ?? 0);
    this.f = Number(values[5] ?? 0);
  }

  get m11() { return this.a; }
  get m12() { return this.b; }
  get m21() { return this.c; }
  get m22() { return this.d; }
  get m41() { return this.e; }
  get m42() { return this.f; }
  get isIdentity() { return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0; }

  multiplySelf() { return this; }
  preMultiplySelf() { return this; }
  translateSelf() { return this; }
  scaleSelf() { return this; }
  scale3dSelf() { return this; }
  rotateSelf() { return this; }
  rotateAxisAngleSelf() { return this; }
  skewXSelf() { return this; }
  skewYSelf() { return this; }
  invertSelf() { return this; }
  flipX() { return this; }
  flipY() { return this; }
  multiply() { return new PdfDomMatrixPolyfill(); }
  translate() { return new PdfDomMatrixPolyfill(); }
  scale() { return new PdfDomMatrixPolyfill(); }
  rotate() { return new PdfDomMatrixPolyfill(); }
  inverse() { return new PdfDomMatrixPolyfill(); }
  transformPoint<T>(point: T) { return point; }
  toFloat32Array() { return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
  toFloat64Array() { return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
  toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }

  static fromMatrix(other?: { a?: number; b?: number; c?: number; d?: number; e?: number; f?: number }) {
    return new PdfDomMatrixPolyfill([other?.a ?? 1, other?.b ?? 0, other?.c ?? 0, other?.d ?? 1, other?.e ?? 0, other?.f ?? 0]);
  }
  static fromFloat32Array(array32: Float32Array) { return new PdfDomMatrixPolyfill(Array.from(array32)); }
  static fromFloat64Array(array64: Float64Array) { return new PdfDomMatrixPolyfill(Array.from(array64)); }
}

class PdfImageDataPolyfill {
  data: unknown;
  width: number;
  height: number;
  colorSpace = "srgb";
  constructor(dataOrWidth: unknown, width?: number, height?: number) {
    this.data = ArrayBuffer.isView(dataOrWidth) ? dataOrWidth : null;
    this.width = typeof width === "number" ? width : Number(dataOrWidth || 0);
    this.height = typeof height === "number" ? height : this.width;
  }
}

class PdfPath2DPolyfill {
  constructor(..._args: unknown[]) {
    void _args;
  }
  addPath() {}
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Cloud Run's Node runtime does not provide browser canvas globals that
  // pdfjs/pdf-parse expects. Install minimal text-extraction polyfills before
  // importing pdf-parse so long public guideline PDFs can be extracted instead
  // of falling back to manual review.
  const pdfRuntimeGlobals = globalThis as Record<string, unknown>;
  pdfRuntimeGlobals.DOMMatrix ??= PdfDomMatrixPolyfill;
  pdfRuntimeGlobals.ImageData ??= PdfImageDataPolyfill;
  pdfRuntimeGlobals.Path2D ??= PdfPath2DPolyfill;
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const info = await parser.getInfo({ parsePageInfo: false });
    const totalPages = Number(info.total || 0);
    const parseParams = totalPages > 0
      ? { partial: Array.from({ length: totalPages }, (_, index) => index + 1), pageJoiner: "\n-- page_number of total_number --\n" }
      : { pageJoiner: "\n-- page_number of total_number --\n" };
    const parsed = await parser.getText(parseParams);
    return String(parsed.text || "").replace(/[ \t\f\v]+/g, " ").replace(/\n\s+/g, "\n").trim();
  } finally {
    await parser.destroy();
  }
}

export async function fetchSourceUrl(sourceUrl: string): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  const url = new URL(normalizePhysicianSourceUrl(sourceUrl));
  if (url.protocol !== "https:") throw new Error("Only HTTPS source URLs are allowed");

  const response = await fetch(url, { headers: { "User-Agent": "MedEvidenceConsentAgent/0.1" } });
  if (!response.ok) throw new Error(`source fetch failed: ${response.status}`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_SOURCE_URL_BYTES) throw new Error("source file is too large");

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_SOURCE_URL_BYTES) throw new Error("source file is too large");

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: decodeURIComponent(url.pathname.split("/").pop() || "source-evidence.pdf"),
    contentType: response.headers.get("content-type") || "application/pdf",
  };
}

function splitQuestionTokens(question: string): string[] {
  const normalized = question.toLowerCase();
  return Array.from(new Set([
    ...(normalized.match(/[a-z0-9]+(?:[-\s][a-z0-9]+)*/g) ?? []),
    ...normalized
      .split(/[\s、。・？?（）()「」『』【】\[\],.\/]+/)
      .flatMap((token) => token.split(/(?:は|が|を|に|で|へ|から|まで|として|について|とは|なら|だと|ですか|ますか|れる|する|した|して|と|や|vs)/i)),
  ]
    .map((token) => token.trim())
    .flatMap((token) => {
      const variants = [token];
      if (token.endsWith("リハ")) variants.push("リハビリ");
      if (token.endsWith("テーション")) variants.push(token.replace(/テーション$/, ""));
      return variants;
    })
    .filter((token) => token.length >= 2)));
}

export function expandQuestionTermsForSourceSearch(question = ""): string[] {
  const normalized = question.toLowerCase();
  const terms = new Set<string>([
    "急性A型", "Stanford A", "大動脈解離", "脳梗塞", "脳卒中", "死亡", "腎不全", "腎機能", "AKI", "CIN", "出血", "再手術", "手術死亡",
  ].map((term) => term.toLowerCase()));
  splitQuestionTokens(question).forEach((term) => terms.add(term.toLowerCase()));
  const add = (values: string[]) => values.forEach((value) => terms.add(value.toLowerCase()));

  if (/腎|透析|尿|renal|kidney|aki|dialysis|造影|cin/.test(normalized)) add(["腎", "腎不全", "腎機能", "急性腎障害", "透析", "renal", "kidney", "AKI", "dialysis", "造影", "CIN"]);
  if (/脳|麻痺|意識|stroke|neurolog/.test(normalized)) add(["脳梗塞", "脳卒中", "脳障害", "神経", "麻痺", "stroke", "neurologic"]);
  if (/出血|輸血|止血|bleed|hemorrhage|transfusion/.test(normalized)) add(["出血", "輸血", "止血", "再開胸", "再手術", "bleeding", "hemorrhage", "transfusion", "hemostasis", "reoperation"]);
  if (/感染|発熱|創部|膿|抗菌|infection|sepsis|fever|wound/.test(normalized)) add(["感染", "感染症", "発熱", "創部", "敗血症", "抗菌薬", "infection", "sepsis", "fever", "wound"]);
  if (/呼吸|肺|人工呼吸|酸素|抜管|respiratory|pulmonary|ventilat|oxygen/.test(normalized)) add(["呼吸", "呼吸不全", "肺", "肺合併症", "人工呼吸", "酸素", "抜管", "respiratory", "pulmonary", "ventilation", "oxygen"]);
  if (/腸|腹|腸管|腸間膜|malperfusion|mesenteric|bowel|visceral|ischemia/.test(normalized)) add(["腸管虚血", "腸間膜", "臓器虚血", "臓器灌流障害", "malperfusion", "mesenteric", "bowel", "visceral", "ischemia"]);
  if (/脊髄|対麻痺|下半身|spinal|paraplegia/.test(normalized)) add(["脊髄", "脊髄虚血", "対麻痺", "SCI", "spinal", "paraplegia", "脊髄保護", "灌流", "ドレナージ"]);
  if (/妊娠|出産|妊婦|pregnan|reproductive/.test(normalized)) add(["妊娠", "妊婦", "出産", "pregnancy", "pregnant", "reproductive"]);
  if (/遺伝|マルファン|marfan|家族/.test(normalized)) add(["遺伝", "マルファン", "Marfan", "家族歴", "genetic", "familial"]);
  if (/ステント|tev(ar)?|open stent|frozen elephant|f(e)?t/i.test(normalized)) add(["ステント", "TEVAR", "open stent", "frozen elephant trunk", "FET"]);
  if (/降圧|血圧|β|ベータ|薬|medical|anti-hypertensive/.test(normalized)) add(["血圧", "降圧", "β遮断薬", "ベータ遮断薬", "medical treatment", "anti-hypertensive"]);
  if (/リハビリ|離床|日常生活|adl|rehabilitation|mobilization/i.test(normalized)) add(["リハビリ", "リハビリテーション", "離床", "早期離床", "日常生活動作", "ADL", "rehabilitation", "mobilization"]);
  if (/推奨|class|エビデンス|グレード|level/.test(normalized)) add(["推奨", "Class", "Level", "エビデンス", "グレード"]);

  return Array.from(terms).filter((term) => term.length >= 2).slice(0, 60);
}

export type SourceChunk = { text: string; index: number; page?: number; sectionHeading?: string };

function extractGuidelineSectionHeading(text: string): string | undefined {
  const heading = text.match(/(?:第\s*\d+\s*章\s*[^。\n]{2,40}|(?:^|\s)\d+(?:\.\d+)+\s+[^。\n]{2,50})/)?.[0];
  return heading?.replace(/\s+/g, " ").trim();
}

export function splitIntoSourceChunks(sourceText: string): SourceChunk[] {
  const normalized = sourceText.replace(/\r\n/g, "\n").trim();
  const pagePattern = /--\s*(\d+)\s+of\s+\d+\s+--/g;
  const markers = Array.from(normalized.matchAll(pagePattern));
  if (markers.length > 0) {
    const chunks: SourceChunk[] = [];
    let activeSectionHeading: string | undefined;
    const firstMarkerIndex = markers[0].index ?? 0;
    if (firstMarkerIndex > 0) {
      const frontMatter = normalized.slice(0, firstMarkerIndex).trim();
      activeSectionHeading = extractGuidelineSectionHeading(frontMatter);
      chunks.push({ text: frontMatter, index: 0, sectionHeading: activeSectionHeading });
    }
    chunks.push(...markers.map((marker, markerIndex) => {
      const index = marker.index ?? 0;
      const nextIndex = markerIndex + 1 < markers.length ? markers[markerIndex + 1].index ?? normalized.length : normalized.length;
      const chunkText = normalized.slice(index, nextIndex).trim();
      const heading = extractGuidelineSectionHeading(chunkText);
      if (heading) activeSectionHeading = heading;
      return { text: chunkText, index, page: Number(marker[1]), sectionHeading: activeSectionHeading };
    }).filter((chunk) => chunk.text.length > 0));
    return chunks.filter((chunk) => chunk.text.length > 0);
  }

  const paragraphChunks = normalized
    .split(/\n\s*\n+/)
    .map((text, index) => ({ text: text.replace(/\s+/g, " ").trim(), index }))
    .filter((chunk) => chunk.text.length > 0);
  if (paragraphChunks.length > 1) return paragraphChunks;

  const chunks: SourceChunk[] = [];
  const targetLength = 2800;
  const overlap = 350;
  for (let index = 0; index < normalized.length; index += targetLength - overlap) {
    const end = Math.min(normalized.length, index + targetLength);
    chunks.push({ text: normalized.slice(index, end).trim(), index });
    if (end >= normalized.length) break;
  }
  return chunks;
}

function isTocOrReferenceLikeChunk(chunk: SourceChunk): boolean {
  const snippet = chunk.text;
  const repeatedJapaneseNamePairs = snippet.match(/[一-龠]{1,4}\s+[一-龠]{1,4}\s+[一-龠]{1,4}\s+[一-龠]{1,4}/g)?.length ?? 0;
  return (
    (chunk.page !== undefined && (chunk.page <= 12 || chunk.page >= 180)) ||
    /\bPMID\b|文献|References|出典元リンクでfact check/i.test(snippet) ||
    (repeatedJapaneseNamePairs >= 4 && !/急性A型|大動脈解離|腎不全|透析|脳梗塞|出血|合併症|緊急手術|治療|推奨/.test(snippet)) ||
    (snippet.match(/\bPQ\s*\d+/g)?.length ?? 0) >= 2 ||
    (snippet.match(/\b\d{1,3}\b/g)?.length ?? 0) >= 120
  );
}

function scoreChunkForQuestion(chunk: SourceChunk, keywords: string[], question: string): number {
  const text = chunk.text;
  const lower = text.toLowerCase();
  const normalizedQuestion = question.toLowerCase();
  const keywordHits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
  const specificHits = keywordHits.filter((keyword) => !/^(急性a型|急性A型|stanford a|大動脈解離|治療|方針|手術|資料|記載)$/.test(keyword));
  const conceptHit =
    (/妊娠|出産|妊婦|pregnan/i.test(normalizedQuestion) && /妊娠|出産|妊婦|pregnan/i.test(text)) ||
    (/腸|腹|腸管|腸間膜|malperfusion|mesenteric|bowel|visceral|ischemia/i.test(normalizedQuestion) && /腸管虚血|腸間膜|臓器虚血|malperfusion|mesenteric|bowel|visceral|ischemia/i.test(text)) ||
    (/脊髄|対麻痺|下半身|spinal|paraplegia/i.test(normalizedQuestion) && /脊髄|対麻痺|\bSCI\b|spinal|paraplegia/i.test(text)) ||
    (/遺伝|マルファン|marfan|家族/i.test(normalizedQuestion) && /遺伝|マルファン|marfan|家族歴|genetic|familial/i.test(text)) ||
    (/リハビリ|離床|日常生活|adl|rehabilitation|mobilization/i.test(normalizedQuestion) && /リハビリ|離床|日常生活動作|ADL|rehabilitation|mobilization/i.test(text));
  const infectionComplicationQuestion = /感染|発熱|創部|膿|抗菌|infection|sepsis|fever|wound/i.test(normalizedQuestion);
  const infectiousAneurysmOnlyNoise = infectionComplicationQuestion && /感染性大動脈瘤|infected\s+(?:aortic\s+)?aneurysm|mycotic\s+aneurysm/i.test(text) && !/術後|手術|創部|発熱|抗菌|抗生剤|合併症|sepsis|wound|postoperative|surgical/i.test(text);

  return (
    keywordHits.length * 24 +
    specificHits.length * 80 +
    (conceptHit ? 220 : 0) +
    (/推奨|治療法の選択|急性大動脈解離|malperfusion|緊急|手術|外科手術|合併症/.test(text) ? 35 : 0) +
    (/透析|腎不全|腎機能|急性腎障害|\baki\b|\bckd\b|\bcin\b|dialysis|renal|kidney|造影|contrast/i.test(text) ? 30 : 0) +
    (/透析|dialysis/i.test(normalizedQuestion) && /透析|dialysis/i.test(text) ? 180 : 0) +
    (/腸管虚血|腸間膜|臓器虚血|malperfusion|mesenteric|bowel|visceral|ischemia/i.test(text) ? 35 : 0) +
    (/脊髄|対麻痺|\bSCI\b|spinal|paraplegia/i.test(text) ? 35 : 0) +
    (/対麻痺|paraplegia/i.test(normalizedQuestion) && /対麻痺|paraplegia/i.test(text) ? 180 : 0) +
    (/防ぐ|予防|気をつけ|avoid|prevent/i.test(normalizedQuestion) && /予防|防止|保護|配慮|保つ|灌流|ドレナージ|CSFD|術後/i.test(text) ? 140 : 0) +
    (/リハビリ|離床|日常生活動作|ADL|rehabilitation|mobilization/i.test(text) ? 25 : 0) +
    (/脳梗塞|脳卒中|死亡|出血|輸血|感染|呼吸不全|再手術|合併症/.test(text) ? 20 : 0) +
    (/stanford\s*a|急性a型/i.test(lower) ? 25 : 0) -
    (infectiousAneurysmOnlyNoise ? 260 : 0) -
    (/\b表\b|表\s*\d|分類\s*\d|より作表|References|文献/i.test(text) ? 180 : 0) -
    (isTocOrReferenceLikeChunk(chunk) ? 120 : 0) -
    chunk.index * 0.00001
  );
}

export function selectRelevantEvidenceTextFromChunks(chunks: SourceChunk[], question = ""): string {
  const keywords = expandQuestionTermsForSourceSearch(question);

  let candidates = chunks
    .map((chunk) => ({ ...chunk, score: question ? scoreChunkForQuestion(chunk, keywords, question) : isTocOrReferenceLikeChunk(chunk) ? -100 : 1 - chunk.index * 0.00001 }))
    .filter((candidate) => question ? candidate.score > 0 : candidate.score > -100);

  if (question) {
    const normalizedQuestion = question.toLowerCase();
    const conceptPattern =
      /妊娠|出産|妊婦|pregnan/i.test(normalizedQuestion) ? /妊娠|出産|妊婦|pregnan/i :
      /腸|腹|腸管|腸間膜|malperfusion|mesenteric|bowel|visceral|ischemia/i.test(normalizedQuestion) ? /腸管虚血|腸間膜|臓器虚血|malperfusion|mesenteric|bowel|visceral|ischemia/i :
      /脊髄|対麻痺|下半身|spinal|paraplegia/i.test(normalizedQuestion) ? /脊髄|対麻痺|\bSCI\b|spinal|paraplegia/i :
      /遺伝|マルファン|marfan|家族/i.test(normalizedQuestion) ? /遺伝|マルファン|marfan|家族歴|genetic|familial/i :
      /感染|発熱|創部|膿|抗菌|infection|sepsis|fever|wound/i.test(normalizedQuestion) ? /感染症|発熱|創部|抗菌|抗生剤|合併症|infection|sepsis|fever|wound|postoperative/i :
      /透析|腎|腎不全|腎障害|aki|dialysis|renal|kidney/i.test(normalizedQuestion) ? /透析|腎不全|腎機能|急性腎障害|AKI|dialysis|renal|kidney/i :
      undefined;
    const conceptCandidates = conceptPattern ? candidates.filter((candidate) => conceptPattern.test(candidate.text)) : [];
    const conceptBodyCandidates = conceptCandidates.filter((candidate) => !isTocOrReferenceLikeChunk(candidate));
    const isSpinalPreventionQuestion = /脊髄|対麻痺|下半身|spinal|paraplegia/i.test(normalizedQuestion) && /防ぐ|予防|気をつけ|avoid|prevent/i.test(normalizedQuestion);
    const spinalProtectionCandidates = isSpinalPreventionQuestion
      ? conceptBodyCandidates.filter((candidate) => /分節動脈盗血の防止と灌流|脳脊髄液ドレナージ|\bCSFD\b|脊髄保護|灌流/i.test(candidate.text))
      : [];
    const isInfectionComplicationQuestion = /感染|発熱|創部|膿|抗菌|infection|sepsis|fever|wound/i.test(normalizedQuestion);
    const infectionComplicationCandidates = isInfectionComplicationQuestion
      ? conceptBodyCandidates.filter((candidate) => /術後|手術|創部|発熱|抗菌|抗生剤|合併症|sepsis|wound|postoperative|surgical/i.test(candidate.text) && !/感染性大動脈瘤|infected\s+(?:aortic\s+)?aneurysm|mycotic\s+aneurysm/i.test(candidate.text))
      : [];
    if (spinalProtectionCandidates.length > 0) {
      candidates = spinalProtectionCandidates;
    } else if (infectionComplicationCandidates.length > 0) {
      candidates = infectionComplicationCandidates;
    } else if (conceptBodyCandidates.length > 0) {
      candidates = conceptBodyCandidates;
    } else if (conceptCandidates.length > 0) {
      const bodyCandidates = candidates.filter((candidate) => !isTocOrReferenceLikeChunk(candidate));
      if (bodyCandidates.length > 0) candidates = bodyCandidates;
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.index - b.index);

  const selectedChunks: string[] = [];
  for (const candidate of candidates) {
    const rawClipped = candidate.text.length <= 3200 ? candidate.text : candidate.text.slice(0, 3200);
    const clipped = candidate.sectionHeading && !rawClipped.includes(candidate.sectionHeading)
      ? `[章/節: ${candidate.sectionHeading}] ${rawClipped}`
      : rawClipped;
    if (selectedChunks.some((existing) => existing.includes(clipped.slice(100, 520)) || clipped.includes(existing.slice(100, 520)))) continue;
    selectedChunks.push(clipped);
    if (selectedChunks.length >= (question ? 10 : 4)) break;
  }

  const selected = selectedChunks.join("\n\n---\n\n");
  return selected.slice(0, question ? 24000 : 12000);
}

export function selectRelevantEvidenceText(text: string, question = ""): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const selected = selectRelevantEvidenceTextFromChunks(splitIntoSourceChunks(normalized), question);
  return selected || normalized.slice(0, question ? 24000 : 12000);
}


type CachedSourceFullText = {
  fileName: string;
  fileSize: number;
  contentType: string;
  fullText: string;
  chunks: SourceChunk[];
  fullTextSha256: string;
  cachedAt: number;
};

// 家族QAは同じガイドラインPDFに対して質問ごとに再抽出するため、
// ダウンロード+PDFパース済みの全文をインスタンス内で使い回す。
// 質問特化のチャンク選択(selectRelevantEvidenceText)は毎回実行する。
const SOURCE_FULL_TEXT_CACHE_TTL_MS = 15 * 60 * 1000;
const SOURCE_FULL_TEXT_CACHE_MAX_ENTRIES = 8;
const sourceFullTextCache = new Map<string, CachedSourceFullText>();

export function clearSourceUrlTextCache(): void {
  sourceFullTextCache.clear();
}

function toSourceChunksFromRecords(records: SourceDocumentChunkRecord[]): SourceChunk[] {
  return records.map((chunk) => ({
    text: chunk.text,
    index: chunk.chunkIndex,
    page: chunk.page,
    sectionHeading: chunk.sectionHeading,
  }));
}

function toSourceChunkRecords(chunks: SourceChunk[]): SourceDocumentChunkRecord[] {
  return chunks.map((chunk, index) => ({
    chunkId: `chunk-${index + 1}`,
    chunkIndex: index,
    text: chunk.text,
    page: chunk.page,
    sectionHeading: chunk.sectionHeading,
  }));
}

async function fetchSourceFullText(sourceUrl: string, repository?: ConsentSessionRepository): Promise<CachedSourceFullText> {
  const cacheKey = normalizePhysicianSourceUrl(sourceUrl);
  const cached = sourceFullTextCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SOURCE_FULL_TEXT_CACHE_TTL_MS) {
    return cached;
  }

  const persistent = await repository?.getSourceDocumentCache?.(cacheKey).catch(() => null);
  if (persistent && persistent.chunks.length > 0) {
    const entry: CachedSourceFullText = {
      fileName: persistent.fileName,
      fileSize: persistent.fileSize,
      contentType: persistent.contentType,
      fullText: "",
      chunks: toSourceChunksFromRecords(persistent.chunks),
      fullTextSha256: persistent.fullTextSha256,
      cachedAt: Date.now(),
    };
    sourceFullTextCache.delete(cacheKey);
    sourceFullTextCache.set(cacheKey, entry);
    return entry;
  }

  const fetched = await fetchSourceUrl(cacheKey);
  let fullText = "";
  if (isLikelyPdf(fetched.fileName, fetched.contentType)) {
    fullText = await extractPdfText(fetched.buffer);
  } else if (fetched.contentType.startsWith("text/") || fetched.fileName.toLowerCase().endsWith(".txt")) {
    fullText = fetched.buffer.toString("utf8");
  }

  const normalizedFullText = fullText.trim();
  const chunks = splitIntoSourceChunks(normalizedFullText);
  const entry: CachedSourceFullText = {
    fileName: fetched.fileName,
    fileSize: fetched.buffer.byteLength,
    contentType: fetched.contentType,
    fullText: normalizedFullText,
    chunks,
    fullTextSha256: createHash("sha256").update(normalizedFullText).digest("hex"),
    cachedAt: Date.now(),
  };
  await repository?.saveSourceDocumentCache?.({
    sourceUrl: cacheKey,
    fileName: entry.fileName,
    fileSize: entry.fileSize,
    contentType: entry.contentType,
    fullTextSha256: entry.fullTextSha256,
    chunks: toSourceChunkRecords(entry.chunks),
  }).catch((error) => console.warn("source document chunk cache save failed; continuing with instance cache", error));
  sourceFullTextCache.delete(cacheKey);
  sourceFullTextCache.set(cacheKey, entry);
  if (sourceFullTextCache.size > SOURCE_FULL_TEXT_CACHE_MAX_ENTRIES) {
    const oldestKey = sourceFullTextCache.keys().next().value;
    if (oldestKey !== undefined) sourceFullTextCache.delete(oldestKey);
  }
  return entry;
}

export async function extractSourceUrlText(sourceUrl: string, question = "", repository?: ConsentSessionRepository): Promise<{ fileName: string; fileSize: number; contentType: string; extractedText: string }> {
  const source = await fetchSourceFullText(sourceUrl, repository);
  const extractedText = source.chunks.length > 0
    ? selectRelevantEvidenceTextFromChunks(source.chunks, question)
    : source.fullText ? selectRelevantEvidenceText(source.fullText, question) : "";
  return { fileName: source.fileName, fileSize: source.fileSize, contentType: source.contentType, extractedText };
}

export async function refreshPhysicianSourceEvidenceForQuestion(evidence: EvidenceCard, question: string, repository?: ConsentSessionRepository): Promise<EvidenceCard> {
  if (!evidence.sourceUrl || evidence.origin !== "physician-upload") return evidence;
  const sourceUrl = normalizePhysicianSourceUrl(evidence.sourceUrl);
  if (!sourceUrl.toLowerCase().endsWith(".pdf")) return evidence;
  const extracted = await extractSourceUrlText(sourceUrl, question, repository);
  if (!extracted.extractedText) return evidence;
  const originalSelectedText = [
    evidence.quotedSpan,
    ...(evidence.keyFindings ?? []),
    evidence.displayForFamily,
    evidence.claim,
  ].filter(Boolean).join("\n");
  return {
    ...createAutoPhysicianUrlEvidence({ sourceUrl, fileName: extracted.fileName || evidence.uploadedFileName, extractedText: `${originalSelectedText}\n${extracted.extractedText}` }),
    evidenceId: evidence.evidenceId,
    retrievalStatus: evidence.retrievalStatus,
    origin: evidence.origin,
  };
}

export async function refreshPhysicianSourceEvidenceSetForQuestion(evidence: EvidenceCard[], question: string, repository?: ConsentSessionRepository): Promise<EvidenceCard[]> {
  return Promise.all(evidence.map(async (item) => {
    try {
      return await refreshPhysicianSourceEvidenceForQuestion(item, question, repository);
    } catch (error) {
      console.warn("question-specific source refresh failed; using stored selected evidence", error);
      return item;
    }
  }));
}
