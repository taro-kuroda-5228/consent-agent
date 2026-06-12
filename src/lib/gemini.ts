import { GoogleGenAI } from "@google/genai";
import {
  retrieveMockEvidence,
  resolveEvidenceSelectionForRequest,
  synthesizeEvidenceBoundQA,
  synthesizeEvidenceBoundQAFromSupportingSpans,
  type CitationVerificationReport,
  type EvidenceCard,
  type FacilityAnswerTemplate,
  type SupportingSpanExtraction,
} from "./consent-demo";
import { isConsentAgentDemoMode } from "./env";

type EnvLike = Record<string, string | undefined>;

export function usesVertexAI(source: EnvLike = process.env): boolean {
  return source.GOOGLE_GENAI_USE_VERTEXAI === "true" && Boolean(source.GOOGLE_CLOUD_PROJECT?.trim());
}

export function createGenAIClient(source: EnvLike = process.env): GoogleGenAI {
  if (usesVertexAI(source)) {
    return new GoogleGenAI({
      vertexai: true,
      project: source.GOOGLE_CLOUD_PROJECT,
      location: source.GOOGLE_CLOUD_LOCATION || "global",
    });
  }
  return new GoogleGenAI({ apiKey: source.GEMINI_API_KEY || "" });
}

export function shouldUseLiveGemini(source: EnvLike = process.env): boolean {
  const hasCredential = Boolean(source.GEMINI_API_KEY?.trim()) || usesVertexAI(source);
  return hasCredential && !isConsentAgentDemoMode(source);
}

export const PATIENT_EXPLANATION_GEMINI_MODEL = "gemini-omni";
export const PATIENT_QA_GEMINI_MODEL = "gemini-3.5-flash";
export const DOCTOR_SUMMARY_GEMINI_MODEL = "gemini-2.5-flash";

export async function generateExplanation(context: {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
  urgency: string;
  purpose: string;
  cardiopulmonaryBypass: boolean;
  transfusion: string;
  notes: string;
  selectedEvidence?: EvidenceCard[];
}) {
  const selectedEvidence = context.selectedEvidence !== undefined
    ? context.selectedEvidence
    : resolveEvidenceSelectionForRequest(retrieveMockEvidence(context.diagnosis), undefined);
  const evidenceText = selectedEvidence
    .map(
      (item) =>
        `- ${item.evidenceId}: ${item.title}\n  種別: ${item.sourceType}\n  引用: ${item.citation}\n  家族向け要点: ${item.displayForFamily}\n  制限: ${item.origin === "facility-document" ? "施設説明資料であり、論文エビデンスではない" : "デモ用に選択された根拠"}`,
    )
    .join("\n");
  if (!shouldUseLiveGemini()) {
    return buildDeterministicOmniExplanationCards(context);
  }

  const prompt = `あなたは急性大動脈解離の緊急手術前に、家族向け説明文を作成するAIアシスタントです。
以下の症例情報をもとに、家族向けの説明カードを5枚生成してください。

【ルール】
- 中学生にもわかる日本語で書く
- 不安を煽らない
- 重大リスクは省略しない
- 治療しない場合の一般的リスクを説明する
- 個別予後や成功率は断定しない
- 医師レビュー前提のドラフトであることを明示する
- 以下の【医師が選択した根拠】に含まれる文献・施設資料だけを根拠として使う
- 選択されていない文献、一般RAG検索、推測した論文は引用しない
- 各カードの最後に「参照: AAD-001」のように該当IDを短く入れる

【医師が選択した根拠】
${evidenceText}

【症例情報】
- 診断: ${context.diagnosis}
- 予定手術: ${context.plannedSurgery}
- 緊急度: ${context.urgency}
- 主な目的: ${context.purpose}
- 人工心肺: ${context.cardiopulmonaryBypass ? "あり" : "なし"}
- 輸血: ${context.transfusion}
- 主なリスク: ${context.risks.join("、")}
- 特記事項: ${context.notes}

【出力形式】
以下のJSON配列を返してください。他の説明文やマークダウンは一切含めず、純粋なJSONのみ返してください。
Gemini Omni説明として、各カードは患者・家族向けに 文字・動画・音声 の3形式で使える内容にしてください。
- content: 画面に表示する文字説明
- videoStoryboard: 動画/アニメーションで見せる場面指示
- audioNarration: 音声ナレーションとしてそのまま読み上げる短文
- modalities: 必ず ["text", "video", "audio"]

[
  {
    "id": "what-is-happening",
    "icon": "🔴",
    "title": "いま起きていること",
    "content": "説明文（100〜150文字程度）",
    "modalities": ["text", "video", "audio"],
    "videoStoryboard": "動画/アニメーション指示",
    "audioNarration": "音声読み上げ文"
  },
  {
    "id": "why-emergency",
    "icon": "⚡",
    "title": "なぜ今すぐ手術が必要か",
    "content": "説明文"
  },
  {
    "id": "surgery-content",
    "icon": "🏥",
    "title": "手術の内容",
    "content": "説明文"
  },
  {
    "id": "main-risks",
    "icon": "⚠️",
    "title": "主なリスク",
    "content": "説明文（リスクを箇条書きで含める）"
  },
  {
    "id": "no-surgery",
    "icon": "🚫",
    "title": "手術しない場合",
    "content": "説明文"
  }
]`;

  try {
    const result = await createGenAIClient().models.generateContent({
      model: PATIENT_EXPLANATION_GEMINI_MODEL,
      contents: prompt,
    });
    const text = result.text ?? "";

    // JSONを抽出
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn("Gemini Omni explanation generation fell back to deterministic multimodal cards:", error);
    return buildDeterministicOmniExplanationCards(context);
  }
}

function buildDeterministicOmniExplanationCards(context: {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
}) {
  const refs = "参照: 医師選択根拠";
  return [
    {
      id: "what-is-happening",
      icon: "🔴",
      title: "いま起きていること",
      content: `${context.diagnosis || "大動脈解離"}では、大動脈の壁が裂け、破裂や臓器への血流障害につながることがあります。${refs}`,
      modalities: ["text", "video", "audio"],
      videoStoryboard: "大動脈の断面を表示し、裂け目と血液が壁内へ入る流れを赤色で示す。",
      audioNarration: "大動脈の壁が裂けており、破裂や血流障害を防ぐために急いで状況を共有します。",
    },
    {
      id: "why-emergency",
      icon: "⚡",
      title: "なぜ今すぐ手術が必要か",
      content: `時間経過で命に関わるリスクが高まるため、待機ではなく緊急治療が必要です。${refs}`,
      modalities: ["text", "video", "audio"],
      videoStoryboard: "時間経過とともに破裂リスクが上がるタイムラインを表示し、手術で危険部位を治療する流れを示す。",
      audioNarration: "この病気は待つほど危険が増えるため、医師は緊急手術を勧めています。",
    },
    {
      id: "surgery-content",
      icon: "🏥",
      title: "手術の内容",
      content: `${context.plannedSurgery || "人工血管置換術"}で、裂けた重要部分を人工血管に置き換える方針です。${refs}`,
      modalities: ["text", "video", "audio"],
      videoStoryboard: "病変部をハイライトし、人工血管へ置き換わるアニメーションを表示する。",
      audioNarration: "手術では、危険な部分を人工血管に置き換えて破裂や血流障害を防ぎます。",
    },
    {
      id: "main-risks",
      icon: "⚠️",
      title: "主なリスク",
      content: `主なリスクには${context.risks.length ? context.risks.join("、") : "出血、脳梗塞、腎不全、死亡など"}があります。個別の見込みは医師が確認します。${refs}`,
      modalities: ["text", "video", "audio"],
      videoStoryboard: "主な合併症をアイコンで並べ、個別リスクは医師確認が必要と表示する。",
      audioNarration: "重大な合併症の可能性があります。患者さんごとの危険度は担当医が補足します。",
    },
    {
      id: "no-surgery",
      icon: "🚫",
      title: "手術しない場合",
      content: `手術しない場合、破裂や心タンポナーデ、臓器虚血など命に関わる経過が懸念されます。${refs}`,
      modalities: ["text", "video", "audio"],
      videoStoryboard: "未治療時の破裂・血流障害リスクを分岐図で示し、手術目的へ戻す。",
      audioNarration: "治療しない場合には、命に関わる合併症が起こる可能性があります。",
    },
  ];
}

type QAContext = {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
  selectedEvidence?: EvidenceCard[];
  facilityAnswerTemplates?: FacilityAnswerTemplate[];
};

export type SourceBoundedSearchPlan = {
  strategy: "source-bounded-agentic-search";
  boundary: "physician-selected-evidence-only";
  queries: Array<{ query: string; intent: "direct-answer" | "comparative" | "general"; targetTerms: string[] }>;
  candidateChunks: Array<{
    evidenceId: string;
    chunkId: string;
    title: string;
    sourceType: EvidenceCard["sourceType"];
    priority: "facility-or-physician-upload-first" | "selected-literature";
    text: string;
    score: number;
  }>;
};

type SourceBoundedSpanExtractor = (
  question: string,
  context: QAContext & { selectedEvidence: EvidenceCard[] },
  plan: SourceBoundedSearchPlan,
) => Promise<SupportingSpanExtraction>;

function normalizeChunkText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitQuestionTokens(question: string): string[] {
  const normalized = question.toLowerCase();
  return Array.from(new Set([
    ...(normalized.match(/[a-z0-9]+(?:[-\s][a-z0-9]+)*/g) ?? []),
    ...normalized.split(/[\s、。・？?（）()]+/),
  ].map((token) => token.trim()).filter((token) => token.length >= 2)));
}

function expandQuestionTargets(question: string): string[] {
  const normalized = question.toLowerCase();
  const targets = new Set(splitQuestionTokens(question));
  const add = (terms: string[]) => terms.forEach((term) => targets.add(term.toLowerCase()));

  if (/長期|長期的|予後|遠隔|late|long[-\s]?term|survival|follow/.test(normalized)) {
    add(["長期", "長期予後", "遠隔期", "long-term", "late mortality", "late survival", "survival", "follow-up", "reoperation"]);
  }
  if (/差|違い|比較|どちら|vs|versus|compared|than/.test(normalized)) {
    add(["比較", "差", "vs", "compared", "than", "higher", "lower", "better", "worse"]);
  }
  if (/\b(?:har|hemiarch|hemi-arch)\b|ヘミアーチ|半弓部/.test(normalized)) add(["HAR", "hemiarch", "hemi-arch", "hemi arch", "hemiarch replacement", "ヘミアーチ", "ヘミアーチ置換", "半弓部"]);
  if (/\b(?:tar)\b|total\s*arch|トータルアーチ|全弓部/.test(normalized)) add(["TAR", "total arch", "total-arch", "total arch replacement", "全弓部", "全弓部置換", "トータルアーチ"]);
  if (/死亡|mortality|death/.test(normalized)) add(["死亡", "死亡率", "mortality", "death"]);
  if (/脳梗塞|脳卒中|stroke/.test(normalized)) add(["脳梗塞", "脳卒中", "stroke"]);
  if (/せん妄|ぼーっと|混乱|delirium|confusion/.test(normalized)) add(["せん妄", "ぼーっと", "delirium", "confusion"]);

  return Array.from(targets).filter((term) => term.length >= 2).slice(0, 24);
}

function inferQueryIntent(question: string): "direct-answer" | "comparative" | "general" {
  const normalized = question.toLowerCase();
  if (/差|違い|比較|どちら|vs|versus|compared|than/.test(normalized)) return "comparative";
  if (/何%|何％|どれくらい|どのくらい|死亡率|発生率|率|mortality|incidence|rate/.test(normalized)) return "direct-answer";
  return "general";
}

function buildSourceBoundedSearchPlan(question: string, selectedEvidence: EvidenceCard[]): SourceBoundedSearchPlan {
  const targetTerms = expandQuestionTargets(question);
  const intent = inferQueryIntent(question);
  const queryCore = targetTerms.slice(0, 8).join(" ");
  const queries = [
    { query: queryCore || question, intent, targetTerms },
    { query: `${question} ${targetTerms.filter((term) => /long-term|late mortality|survival|follow-up|reoperation/.test(term)).join(" ")}`.trim(), intent, targetTerms },
    { query: targetTerms.filter((term) => /hemiarch|total arch|compared|than|higher|lower|better|worse|late mortality/.test(term)).join(" ") || queryCore || question, intent, targetTerms },
  ].filter((item, index, items) => item.query && items.findIndex((other) => other.query === item.query) === index);

  const candidateChunks = selectedEvidence.flatMap((item, evidenceIndex) => {
    const priority = item.origin === "facility-document" || item.origin === "physician-upload" ? "facility-or-physician-upload-first" as const : "selected-literature" as const;
    const spans = [
      ...(item.keyFindings ?? []),
      item.quotedSpan,
      item.displayForFamily,
      item.claim,
      item.clinicianSummary,
    ].filter((span): span is string => Boolean(span)).map(normalizeChunkText);

    return spans.map((text, spanIndex) => {
      const normalizedText = text.toLowerCase();
      const termHits = targetTerms.filter((term) => normalizedText.includes(term.toLowerCase())).length;
      const comparisonBoost = intent === "comparative" && /差|違い|比較|高|低|良好|不良|higher|lower|better|worse|than|compared/i.test(text) ? 20 : 0;
      const directAnswerBoost = intent === "direct-answer" && /\d+(?:\.\d+)?\s*[％%]|mortality|死亡率|発生率|incidence|rate/i.test(text) ? 16 : 0;
      const sourceBoost = priority === "facility-or-physician-upload-first" ? 6 : 0;
      const score = termHits * 8 + comparisonBoost + directAnswerBoost + sourceBoost - evidenceIndex * 0.01 - spanIndex * 0.001;
      return {
        evidenceId: item.evidenceId,
        chunkId: `chunk-${spanIndex + 1}`,
        title: item.title,
        sourceType: item.sourceType,
        priority,
        text,
        score,
      };
    });
  }).sort((a, b) => b.score - a.score).slice(0, 12);

  return {
    strategy: "source-bounded-agentic-search",
    boundary: "physician-selected-evidence-only",
    queries,
    candidateChunks,
  };
}

function serializeEvidenceForSpanExtraction(plan: SourceBoundedSearchPlan): string {
  return plan.candidateChunks
    .map((chunk) => `SOURCE ${chunk.evidenceId}\nTitle: ${chunk.title}\nType: ${chunk.sourceType}\nPriority: ${chunk.priority}\n${chunk.chunkId}: ${chunk.text}`)
    .join("\n\n");
}

function parseSupportingSpanExtraction(text: string): SupportingSpanExtraction {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse source-bounded extraction response as JSON");
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<SupportingSpanExtraction>;
  return {
    answerable: parsed.answerable === true,
    confidence: parsed.confidence === "high" || parsed.confidence === "moderate" || parsed.confidence === "low" ? parsed.confidence : "low",
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
    supportingSpans: Array.isArray(parsed.supportingSpans)
      ? parsed.supportingSpans
          .filter((item) => typeof item?.evidenceId === "string" && typeof item?.span === "string")
          .map((item) => ({ evidenceId: item.evidenceId, span: item.span, chunkId: typeof item.chunkId === "string" ? item.chunkId : undefined }))
      : [],
    abstainReason: typeof parsed.abstainReason === "string" ? parsed.abstainReason : undefined,
  };
}

export async function extractSupportingSpansWithGemini(
  question: string,
  context: QAContext & { selectedEvidence: EvidenceCard[] },
  plan: SourceBoundedSearchPlan = buildSourceBoundedSearchPlan(question, context.selectedEvidence),
): Promise<SupportingSpanExtraction> {
  const evidenceText = serializeEvidenceForSpanExtraction(plan);
  const queryText = plan.queries
    .map((query, index) => `${index + 1}. [${query.intent}] ${query.query}`)
    .join("\n");
  const prompt = `あなたはMedEvidence Consent AgentのSource-bounded Retrieval担当です。
医師が選択したソースだけを読み、家族の質問に直接答えられる根拠スパンを抽出してください。

【最重要ルール】
- 以下の【医師が選択したソース】に含まれる文字列だけを根拠にする。
- 選択されていない文献、一般知識、推測、外部検索は禁止。
- supportingSpans[].span は、ソース内の文を原文のままコピーする。要約・翻訳・言い換えは禁止。
- 直接答える記載がない場合は answerable=false にする。
- 施設資料または医師アップロード資料が直接答えられる場合は、それを最優先する。
- 個別の成功率・同意判断を求める質問は、スパンがあっても慎重に扱うため confidence=low にする。

【症例】
- 診断: ${context.diagnosis}
- 予定手術: ${context.plannedSurgery}
- リスク: ${context.risks.join("、") || "未入力"}

【家族の質問】
${question}

【Agentic Search Plan】
${queryText || "（検索計画なし）"}

【医師が選択したソース】
${evidenceText || "（選択済みソースなし）"}

【出力形式】
JSONのみを返してください。
{
  "answerable": true,
  "confidence": "high | moderate | low",
  "reason": "質問とスパンが直接対応する理由。なければ不足理由。",
  "supportingSpans": [
    { "evidenceId": "SOURCE_ID", "chunkId": "chunk-1", "span": "ソース内の文を原文コピー" }
  ],
  "abstainReason": "answerable=false の場合のみ"
}`;

  const result = await createGenAIClient().models.generateContent({
    model: PATIENT_QA_GEMINI_MODEL,
    contents: prompt,
  });
  return parseSupportingSpanExtraction(result.text ?? "");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function generateQA(
  question: string,
  context: QAContext,
  spanExtractor: SourceBoundedSpanExtractor = extractSupportingSpansWithGemini,
): Promise<{
  answer: string;
  safetyLabel: "general" | "doctor-review" | "individual-prognosis" | "consent-guidance" | "facility-template";
  requiresDoctorReview: boolean;
  retrievalMode?: "physician-curated-only";
  evidenceReferences?: string[];
  retrievedEvidence?: EvidenceCard[];
  templateReferences?: FacilityAnswerTemplate[];
  supportingSpans?: Array<{ evidenceId: string; text: string }>;
  extractionMode?: "facility-template" | "agentic-source-bounded" | "deterministic-source-bounded";
  citationVerification?: CitationVerificationReport;
}> {
  const selectedEvidence = context.selectedEvidence !== undefined
    ? context.selectedEvidence
    : resolveEvidenceSelectionForRequest(retrieveMockEvidence(context.diagnosis), undefined);

  const resolvedContext = { ...context, selectedEvidence };
  const searchPlan = buildSourceBoundedSearchPlan(question, selectedEvidence);

  if (!shouldUseLiveGemini() && spanExtractor === extractSupportingSpansWithGemini) {
    return { ...synthesizeEvidenceBoundQA(question, resolvedContext), extractionMode: "deterministic-source-bounded" };
  }

  try {
    const extraction = await withTimeout(spanExtractor(question, resolvedContext, searchPlan), 18000, "Source-bounded extraction");
    const agenticResult = synthesizeEvidenceBoundQAFromSupportingSpans(question, resolvedContext, extraction);
    if (agenticResult.evidenceReferences.length > 0 || agenticResult.safetyLabel !== "doctor-review") {
      return agenticResult;
    }
  } catch (error) {
    console.warn("Source-bounded extraction failed; falling back to deterministic selected-source retrieval", error);
  }

  return { ...synthesizeEvidenceBoundQA(question, resolvedContext), extractionMode: "deterministic-source-bounded" };
}

export async function generateDoctorSummary(data: {
  caseId: string;
  explanationViewed: string[];
  qaLog: { question: string; answer: string; safetyLabel: string }[];
  understandingAnswers: { question: string; answer: string }[];
  concerns: string;
  risks: string[];
}) {
  const prompt = `あなたは緊急手術前の家族説明セッションの結果を、担当医師向けに整理するAIアシスタントです。

以下のデータをもとに、医師が30秒で把握できるサマリーを生成してください。

【症例】${data.caseId}
【主なリスク】${data.risks.join("、")}

【家族が閲覧した説明】
${data.explanationViewed.map((t) => `・${t}`).join("\n")}

【Q&A履歴】
${data.qaLog.map((q) => `Q: ${q.question} → ${q.safetyLabel}`).join("\n")}

【理解度チェック回答】
${data.understandingAnswers.map((q) => `Q: ${q.question} → ${q.answer}`).join("\n")}

【家族の自由記述（不安・要望）】
${data.concerns || "（特になし）"}

【出力形式】
以下のJSONのみを返してください。

{
  "summary": {
    "understood": ["理解できた項目1", ...],
    "notUnderstood": ["未理解の項目1", ...],
    "concerns": ["家族の不安1", ...],
    "doctorQuestions": ["医師が直接答えるべき質問1", ...]
  },
  "suggestedScript": "医師が家族に直接伝えるべきポイントを3〜4行の箇条書きで",
  "anxietyLevel": "low | medium | high",
  "readiness": "ready | needs-more-talk | needs-doctor-answers"
}`;

  const result = await createGenAIClient().models.generateContent({
    model: DOCTOR_SUMMARY_GEMINI_MODEL,
    contents: prompt,
  });
  const text = result.text ?? "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini summary response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
