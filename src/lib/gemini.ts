import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  retrieveMockEvidence,
  resolveEvidenceSelectionForRequest,
  synthesizeEvidenceBoundQA,
  type EvidenceCard,
  type FacilityAnswerTemplate,
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

export async function generateQA(
  question: string,
  context: {
    diagnosis: string;
    plannedSurgery: string;
    risks: string[];
    selectedEvidence?: EvidenceCard[];
    facilityAnswerTemplates?: FacilityAnswerTemplate[];
  }
): Promise<{
  answer: string;
  safetyLabel: "general" | "doctor-review" | "individual-prognosis" | "consent-guidance";
  requiresDoctorReview: boolean;
  retrievalMode?: "physician-curated-only";
  evidenceReferences?: string[];
  retrievedEvidence?: EvidenceCard[];
  templateReferences?: FacilityAnswerTemplate[];
}> {
  const selectedEvidence = context.selectedEvidence !== undefined
    ? context.selectedEvidence
    : resolveEvidenceSelectionForRequest(retrieveMockEvidence(context.diagnosis), undefined);

  return synthesizeEvidenceBoundQA(question, { ...context, selectedEvidence });
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
