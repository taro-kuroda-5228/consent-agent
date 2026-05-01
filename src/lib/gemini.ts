import { GoogleGenerativeAI } from "@google/generative-ai";

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
}) {
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
  }
): Promise<{
  answer: string;
  safetyLabel: "general" | "doctor-review" | "individual-prognosis" | "consent-guidance";
  requiresDoctorReview: boolean;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `あなたは急性大動脈解離の緊急手術に関する家族からの質問に答えるAIアシスタントです。

【ルール】
- 中学生にもわかる日本語で答える
- 不安を煽らない
- 重大リスクは省略しない
- 個別予後や成功率は断定しない
- 「手術を受けるべきですか」「同意しないといけませんか」には同意誘導せず、医師判断であることを明記
- 個別の死亡率・リスク率を断定しない
- 一般的な医学情報として回答する

【症例情報】
- 診断: ${context.diagnosis}
- 予定手術: ${context.plannedSurgery}
- 主なリスク: ${context.risks.join("、")}

【家族からの質問】
${question}

【出力形式】
以下のJSONのみを返してください。

{
  "answer": "回答文（200文字以内）",
  "safetyLabel": "general | doctor-review | individual-prognosis | consent-guidance",
  "requiresDoctorReview": true | false
}

safetyLabel:
- "general": 一般的な医学情報
- "doctor-review": 医師の直接説明が必要（個別リスク、成功率等）
- "individual-prognosis": 個別予後に関する質問（断定不可）
- "consent-guidance": 同意に関する誘導的質問（注意が必要）`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini Q&A response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
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
