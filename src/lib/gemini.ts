import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  retrieveMockEvidence,
  resolveEvidenceSelectionForRequest,
  synthesizeEvidenceBoundQA,
  synthesizeEvidenceBoundQAFromSupportingSpans,
  type EvidenceCard,
  type FacilityAnswerTemplate,
  type SupportingSpanExtraction,
} from "./consent-demo";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

[
  {
    "id": "what-is-happening",
    "icon": "🔴",
    "title": "いま起きていること",
    "content": "説明文（100〜150文字程度）"
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSONを抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

type QAContext = {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
  selectedEvidence?: EvidenceCard[];
  facilityAnswerTemplates?: FacilityAnswerTemplate[];
};

type SourceBoundedSpanExtractor = (question: string, context: QAContext & { selectedEvidence: EvidenceCard[] }) => Promise<SupportingSpanExtraction>;

function serializeEvidenceForSpanExtraction(selectedEvidence: EvidenceCard[]): string {
  return selectedEvidence
    .map((item) => {
      const spans = [
        ...(item.keyFindings ?? []),
        item.quotedSpan,
        item.displayForFamily,
        item.claim,
        item.clinicianSummary,
      ]
        .filter((span): span is string => Boolean(span))
        .map((span, index) => `  - chunk-${index + 1}: ${span.replace(/\s+/g, " ").trim()}`)
        .join("\n");

      return `SOURCE ${item.evidenceId}\nTitle: ${item.title}\nType: ${item.sourceType}\nPriority: ${item.origin === "facility-document" || item.origin === "physician-upload" ? "facility-or-physician-upload-first" : "selected-literature"}\nChunks:\n${spans}`;
    })
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
): Promise<SupportingSpanExtraction> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const evidenceText = serializeEvidenceForSpanExtraction(context.selectedEvidence);
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

  const result = await model.generateContent(prompt);
  return parseSupportingSpanExtraction(result.response.text());
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
}> {
  const selectedEvidence = context.selectedEvidence !== undefined
    ? context.selectedEvidence
    : resolveEvidenceSelectionForRequest(retrieveMockEvidence(context.diagnosis), undefined);

  const resolvedContext = { ...context, selectedEvidence };

  if (!process.env.GEMINI_API_KEY && spanExtractor === extractSupportingSpansWithGemini) {
    return { ...synthesizeEvidenceBoundQA(question, resolvedContext), extractionMode: "deterministic-source-bounded" };
  }

  try {
    const extraction = await spanExtractor(question, resolvedContext);
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini summary response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
