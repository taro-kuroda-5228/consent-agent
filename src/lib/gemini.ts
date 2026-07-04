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

type GeneratedExplanationCard = {
  id: string;
  icon: string;
  title: string;
  content: string;
  modalities: string[];
  visualId: string;
  audioNarration: string;
  safetyNote: string;
  evidenceIds: string[];
};

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

export const PATIENT_EXPLANATION_GEMINI_MODEL = "gemini-3.5-flash";
export const PATIENT_QA_GEMINI_MODEL = "gemini-3.5-flash";
export const DOCTOR_SUMMARY_GEMINI_MODEL = "gemini-3.5-flash";

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
}): Promise<GeneratedExplanationCard[]> {
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
    return buildDeterministicGeminiExplanationCards(context, selectedEvidence);
  }

  const prompt = `あなたは急性大動脈解離の緊急手術前に、家族向けの実臨床用AI説明画面を構成するアシスタントです。
以下の症例情報をもとに、家族向けの説明カードを必ず6枚生成してください。これはプレビューや機能紹介ではなく、医師の同席下で家族がその場で説明を受ける本体画面です。

【ルール】
- 中学生にもわかる日本語で書く
- 不安を煽らない
- 重大リスクは省略しない
- 治療しない場合の一般的リスクを説明する
- 確率・数値リスクは、施設テンプレートや医師が選択した説明値がある場合だけ表示する。なければ「担当医が説明します」の責任逃れ文ではなく、家族が理解すべきリスクの種類を簡潔に示す
- 「AIは」「AI説明の後」「一般的な説明」「医師が直接説明します」「[REDACTED]」など、責任逃れ・内部処理・不安を煽る表現は使わない
- procedureカードでは、予定手術名を横文字の術式ラベルとしてそのまま出さない。「緊急人工血管置換」の中に、上行置換、ヘミアーチ置換、部分弓部置換、全弓部置換、全弓部置換＋FETなどの範囲があると説明する
- 人工心肺は必ず使用する前提で説明する
- 以下の【医師が選択した根拠】に含まれる文献・施設資料だけを根拠として使う
- 選択されていない文献、一般RAG検索、推測した論文は引用しない
- 各カードに匿名模式図のID visualId と音声読み上げ文 audioNarration を必ず入れる
- videoStoryboard、CT画像、動画ストーリーボード、機能紹介、プレビューという語は使わない

【医師が選択した根拠】
${evidenceText}

【症例情報】
- 診断: ${context.diagnosis}
- 予定手術: ${context.plannedSurgery}
- 緊急度: ${context.urgency}
- 主な目的: ${context.purpose}
- 人工心肺: 使用する
- 輸血: ${context.transfusion}
- 主なリスク: ${context.risks.join("、")}
- 特記事項: ${context.notes}

【出力形式】
以下のJSON配列を返してください。他の説明文やマークダウンは一切含めず、純粋なJSONのみ返してください。
カードIDは必ず次の順序にしてください: disease-mechanism, emergency-need, procedure, major-risks, no-surgery, doctor-confirmation。
- content: 画面に表示する文字説明
- visualId: 匿名模式図ID
- audioNarration: 音声ナレーションとしてそのまま読み上げる短文
- safetyNote: 必ず「疑問が残る場合は次の質問・理解確認画面で記載してください。」
- modalities: 必ず ["text", "diagram", "audio"]
- evidenceIds: 参照した医師選択根拠IDの配列

[
  {
    "id": "disease-mechanism",
    "icon": "🔴",
    "title": "1. いま体の中で起きていること",
    "content": "説明文（100〜180文字程度）",
    "modalities": ["text", "diagram", "audio"],
    "visualId": "ataad-mechanism-anonymous-diagram",
    "audioNarration": "音声読み上げ文",
    "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。",
    "evidenceIds": ["FAC-001"]
  },
  { "id": "emergency-need", "icon": "⚡", "title": "2. なぜ緊急対応が必要か", "content": "説明文", "modalities": ["text", "diagram", "audio"], "visualId": "ataad-emergency-risk-timeline", "audioNarration": "音声読み上げ文", "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "evidenceIds": ["FAC-001"] },
  { "id": "procedure", "icon": "🏥", "title": "3. 手術で目指すこと", "content": "緊急人工血管置換では、解離の広がりに応じて、上行置換、ヘミアーチ置換、部分弓部置換、全弓部置換、全弓部置換＋FETなどから手術範囲を決めます。手術では人工心肺を使用します。", "modalities": ["text", "diagram", "audio"], "visualId": "ataad-graft-replacement-diagram", "audioNarration": "音声読み上げ文", "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "evidenceIds": ["FAC-001"] },
  { "id": "major-risks", "icon": "⚠️", "title": "4. 重要なリスク", "content": "説明文", "modalities": ["text", "diagram", "audio"], "visualId": "ataad-major-complications-icons", "audioNarration": "音声読み上げ文", "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "evidenceIds": ["FAC-001"] },
  { "id": "no-surgery", "icon": "🚫", "title": "5. 手術しない場合の心配", "content": "説明文", "modalities": ["text", "diagram", "audio"], "visualId": "ataad-no-surgery-branch-diagram", "audioNarration": "音声読み上げ文", "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "evidenceIds": ["FAC-001"] },
  { "id": "doctor-confirmation", "icon": "🧑‍⚕️", "title": "6. 疑問が残ったとき", "content": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "modalities": ["text", "diagram", "audio"], "visualId": "doctor-handoff-confirmation-card", "audioNarration": "音声読み上げ文", "safetyNote": "疑問が残る場合は次の質問・理解確認画面で記載してください。", "evidenceIds": ["FAC-001"] }
]`;

  try {
    const result = await createGenAIClient().models.generateContent({
      model: PATIENT_EXPLANATION_GEMINI_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = result.text ?? "";

    // JSONを抽出
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return validateGeminiExplanationCards(JSON.parse(jsonMatch[0]), selectedEvidence);
  } catch (error) {
    console.warn("Gemini explanation generation fell back to deterministic multimodal cards:", error);
    return buildDeterministicGeminiExplanationCards(context, selectedEvidence);
  }
}

function buildDeterministicGeminiExplanationCards(context: {
  diagnosis: string;
  plannedSurgery: string;
  risks: string[];
}, selectedEvidence: EvidenceCard[]): GeneratedExplanationCard[] {
  const selectedEvidenceIds = new Set(selectedEvidence.map((item) => item.evidenceId));
  const pickEvidenceIds = (tags: string[]) => {
    const matched = selectedEvidence
      .filter((item) => item.outcomeTags?.some((tag) => tags.includes(tag)))
      .map((item) => item.evidenceId);
    const fallback = selectedEvidence.slice(0, 1).map((item) => item.evidenceId);
    return (matched.length ? matched : fallback).filter((id) => selectedEvidenceIds.has(id));
  };
  const sourceText = (tags: string[], fallback: string) => {
    const source = selectedEvidence.find((item) => item.outcomeTags?.some((tag) => tags.includes(tag))) ?? selectedEvidence[0];
    if (!source) {
      return `${fallback} 医師が選択した根拠が不足しています。この説明は下書きとして停止し、担当医が根拠資料を追加してから家族説明に進みます。`;
    }
    return source.displayForFamily || fallback;
  };
  const audioText = (fallback: string) => selectedEvidence.length
    ? fallback
    : "医師が選択した根拠が不足しているため、この音声説明は下書きとして停止します。";
  const selectedRisks = context.risks.length ? context.risks.join("、") : "死亡、脳梗塞、出血、腎不全、臓器障害";
  const commonSafetyNote = "疑問が残る場合は次の質問・理解確認画面で記載してください。";
  return [
    {
      id: "disease-mechanism",
      icon: "🔴",
      title: "1. いま体の中で起きていること",
      content: sourceText(["disease-definition", "guideline"], `${context.diagnosis || "急性A型大動脈解離"}について、医師選択済み根拠の範囲で説明します。`),
      modalities: ["text", "diagram", "audio"],
      visualId: "ataad-mechanism-anonymous-diagram",
      audioNarration: audioText("心臓に近い太い血管の壁が裂けています。血液の流れが乱れ、破裂や臓器の血流低下につながる可能性があります。"),
      safetyNote: commonSafetyNote,
      evidenceIds: pickEvidenceIds(["disease-definition", "guideline"]),
    },
    {
      id: "emergency-need",
      icon: "⚡",
      title: "2. なぜ緊急対応が必要か",
      content: sourceText(["time-sensitive", "mortality", "consent"], "緊急性は医師選択済み根拠の範囲で説明します。"),
      modalities: ["text", "diagram", "audio"],
      visualId: "ataad-emergency-risk-timeline",
      audioNarration: audioText("この病気は待っている間に急に悪くなることがあります。命に関わる合併症を防ぐため、緊急で治療を進めます。"),
      safetyNote: commonSafetyNote,
      evidenceIds: pickEvidenceIds(["time-sensitive", "mortality", "consent"]),
    },
    {
      id: "procedure",
      icon: "🏥",
      title: "3. 手術で目指すこと",
      content: `${sourceText(["treatment-strategy", "consent"], "手術目的は医師選択済み根拠の範囲で説明します。")} 予定される治療は「${context.plannedSurgery || "緊急人工血管置換"}」です。`,
      modalities: ["text", "diagram", "audio"],
      visualId: "ataad-graft-replacement-diagram",
      audioNarration: audioText("手術では危険な大動脈の部分を人工血管に置き換え、破裂や血流障害を防ぐことを目指します。"),
      safetyNote: commonSafetyNote,
      evidenceIds: pickEvidenceIds(["treatment-strategy", "consent"]),
    },
    {
      id: "major-risks",
      icon: "⚠️",
      title: "4. 重要なリスク",
      content: `${sourceText(["bleeding", "stroke", "renal-failure", "mortality"], "重大リスクは医師選択済み根拠の範囲で説明します。")} 主な確認項目: ${selectedRisks}。`,
      modalities: ["text", "diagram", "audio"],
      visualId: "ataad-major-complications-icons",
      audioNarration: audioText("重大なリスクには、死亡、脳梗塞、出血、腎不全などがあります。患者さんごとの危険度は担当医が補足します。"),
      safetyNote: commonSafetyNote,
      evidenceIds: pickEvidenceIds(["bleeding", "stroke", "renal-failure", "mortality"]),
    },
    {
      id: "no-surgery",
      icon: "🚫",
      title: "5. 手術しない場合の心配",
      content: sourceText(["mortality", "time-sensitive", "consent"], "手術しない場合の見通しは、医師選択済み根拠の範囲で説明します。"),
      modalities: ["text", "diagram", "audio"],
      visualId: "ataad-no-surgery-branch-diagram",
      audioNarration: audioText("手術しない場合には、血管の破裂や心臓の圧迫、臓器への血流低下が進む可能性があります。"),
      safetyNote: commonSafetyNote,
      evidenceIds: pickEvidenceIds(["mortality", "time-sensitive", "consent"]),
    },
    {
      id: "doctor-confirmation",
      icon: "🧑‍⚕️",
      title: "6. 疑問が残ったとき",
      content: "疑問が残る場合は次の質問・理解確認画面で記載してください。",
      modalities: ["text", "diagram", "audio"],
      visualId: "doctor-handoff-confirmation-card",
      audioNarration: audioText("最後に担当医が、この患者さんに合わせた見通しと質問への回答を確認します。わからない点は次の画面で残せます。"),
      safetyNote: commonSafetyNote,
      evidenceIds: selectedEvidence.slice(0, 1).map((item) => item.evidenceId),
    },
  ];
}

function validateGeminiExplanationCards(value: unknown, selectedEvidence: EvidenceCard[]): GeneratedExplanationCard[] {
  const allowedEvidenceIds = new Set(selectedEvidence.map((item) => item.evidenceId));
  const expectedIds = ["disease-mechanism", "emergency-need", "procedure", "major-risks", "no-surgery", "doctor-confirmation"];
  if (!Array.isArray(value) || value.length !== expectedIds.length) {
    throw new Error("Gemini explanation returned an invalid card array");
  }
  return value.map((card, index) => {
    if (!card || typeof card !== "object") throw new Error("Gemini explanation card is not an object");
    const raw = card as Record<string, unknown>;
    if (raw.id !== expectedIds[index]) throw new Error("Gemini explanation card order mismatch");
    const evidenceIds = Array.isArray(raw.evidenceIds)
      ? raw.evidenceIds.filter((id): id is string => typeof id === "string" && allowedEvidenceIds.has(id))
      : [];
    if (Array.isArray(raw.evidenceIds) && evidenceIds.length !== raw.evidenceIds.length) {
      throw new Error("Gemini explanation referenced evidence outside physician-selected sources");
    }
    return {
      id: String(raw.id),
      icon: typeof raw.icon === "string" ? raw.icon : "💬",
      title: typeof raw.title === "string" ? raw.title : expectedIds[index],
      content: typeof raw.content === "string" ? raw.content : "医師が選択した根拠資料の範囲で説明します。",
      modalities: Array.isArray(raw.modalities) ? raw.modalities.filter((item): item is string => typeof item === "string") : ["text", "diagram", "audio"],
      visualId: typeof raw.visualId === "string" ? raw.visualId : "doctor-handoff-confirmation-card",
      audioNarration: typeof raw.audioNarration === "string" ? raw.audioNarration : "説明内容を確認します。",
      evidenceIds,
      safetyNote: "疑問が残る場合は次の質問・理解確認画面で記載してください。",
    };
  });
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
  if (/腎|腎不全|急性腎障害|透析|renal|kidney|aki|dialysis/.test(normalized)) add(["腎", "腎不全", "急性腎障害", "透析", "renal", "renal failure", "kidney", "AKI", "dialysis"]);
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
    familyAnswer: typeof parsed.familyAnswer === "string" ? parsed.familyAnswer : undefined,
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
- supportingSpans[].span は、ソース内の短い根拠句または文を原文のままコピーする。要約・翻訳・言い換えは禁止。
- familyAnswer は、supportingSpans の内容だけを使って、患者・家族向けの日本語で分かりやすく説明する。医学用語は必要に応じて短く補足する。
- familyAnswer は、非医療者に対するやさしい説明を優先する。科学的根拠を前面に出しすぎず、まず結論と意味を短く伝える。
- オッズ比・リスク比・信頼区間・p値などの研究者向け指標は、質問で明示的に聞かれた場合以外は本文に出さず、「リスクが高くなることと関連」などの自然な表現にする。
- ただし、発生率・割合など家族の理解に役立つ数字は、supportingSpans に存在する場合だけ、過度に断定せず自然な説明文として表現する。
- familyAnswer の本文には「この資料では」「選択された資料では」「根拠論文」「引用箇所」のような根拠提示ラベルを書かない。根拠の原文は supportingSpans に残す。
- familyAnswer に、supportingSpans に存在しない数値・割合・OR/RR・信頼区間・比較結果を追加してはいけない。
- 根拠が英語でも、familyAnswer は患者・家族が読める自然な日本語にする。
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
  "familyAnswer": "answerable=true の場合のみ。supportingSpans だけに基づく患者・家族向けのやさしい日本語説明。研究者向け指標は前面に出しすぎない。",
  "supportingSpans": [
    { "evidenceId": "SOURCE_ID", "chunkId": "chunk-1", "span": "ソース内の文を原文コピー" }
  ],
  "abstainReason": "answerable=false の場合のみ"
}`;

  const result = await createGenAIClient().models.generateContent({
    model: PATIENT_QA_GEMINI_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 0 } },
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
  const deterministicResult = synthesizeEvidenceBoundQA(question, resolvedContext);

  if (!shouldUseLiveGemini() && spanExtractor === extractSupportingSpansWithGemini) {
    return { ...deterministicResult, extractionMode: "deterministic-source-bounded" };
  }

  const shouldTrustDeterministicSelectedSourceAnswer =
    (deterministicResult.evidenceReferences?.length ?? 0) > 0 &&
    deterministicResult.safetyLabel !== "doctor-review" &&
    /リスク|危険|可能性|どれくらい|どのくらい|頻度|発生|発生率|確率|割合|何%|何％|%|％|risk|probability|frequency|incidence|rate|occur/i.test(question);
  if (shouldTrustDeterministicSelectedSourceAnswer) {
    return { ...deterministicResult, extractionMode: "deterministic-source-bounded" };
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

export type ConcernsAssessment = {
  escalate: boolean;
  anxietyLevel: "low" | "medium" | "high";
  reasons: string[];
};

/**
 * 家族の自由記述（不安・確認事項）をAIで評価する。
 * キーワード一致では拾えない不安・理解不足・個別判断の要求を検出し、
 * escalate=true の場合は医師フォローアップへ倒す（安全側）。
 */
export async function assessFamilyConcernsWithGemini(
  concerns: string,
  context: { diagnosis: string; plannedSurgery: string },
): Promise<ConcernsAssessment> {
  const prompt = `あなたは緊急手術前の家族説明セッションで、家族の自由記述を評価する医療安全AIです。

【症例】${context.diagnosis} / ${context.plannedSurgery}

【家族の自由記述】
${concerns}

【判定ルール】
- 強い不安、混乱、理解不足、個別の予後・成功率の要求、同意への迷い、治療への疑念があれば escalate=true。
- 事務的な確認（持ち物、面会時間など）だけなら escalate=false でよい。
- 迷ったら escalate=true（安全側）。

【出力形式】JSONのみ:
{ "escalate": true, "anxietyLevel": "low | medium | high", "reasons": ["医師が対応すべき理由を日本語で"] }`;

  const result = await createGenAIClient().models.generateContent({
    model: PATIENT_QA_GEMINI_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 0 } },
  });
  const text = result.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse concerns assessment as JSON");
  const parsed = JSON.parse(jsonMatch[0]) as Partial<ConcernsAssessment>;
  return {
    escalate: parsed.escalate === true,
    anxietyLevel: parsed.anxietyLevel === "low" || parsed.anxietyLevel === "medium" || parsed.anxietyLevel === "high" ? parsed.anxietyLevel : "medium",
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.filter((item): item is string => typeof item === "string") : [],
  };
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
    config: { thinkingConfig: { thinkingBudget: 0 } },
  });
  const text = result.text ?? "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini summary response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
