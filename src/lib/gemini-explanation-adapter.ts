export interface GeminiExplanationInput {
  caseId: string;
  checkpointId: string;
  audience: 'patient_family' | 'physician';
  language: 'ja';
}

export interface GeminiExplanationOutput {
  mode: 'mock' | 'gemini';
  model: 'gemini-3.5-flash';
  experience: 'gemini-explanation';
  modalities: Array<'text' | 'video' | 'audio'>;
  spokenText: string;
  visualCue: string;
  videoStoryboard: string;
  audioNarration: string;
  textSummary: string;
  followUpPrompt: string;
  safetyNote: string;
}

export interface GeminiExplanationAdapter {
  generateExplanation(input: GeminiExplanationInput): Promise<GeminiExplanationOutput>;
}

export interface GeminiExplanationAdapterOptions {
  geminiApiKey?: string;
  backendEndpoint?: string;
}

const GEMINI_EXPLANATION_MODALITIES: GeminiExplanationOutput['modalities'] = ['text', 'video', 'audio'];

function asGeminiExplanation(input: Omit<GeminiExplanationOutput, 'mode' | 'model' | 'experience' | 'modalities' | 'videoStoryboard' | 'audioNarration' | 'textSummary'> & {
  textSummary?: string;
  videoStoryboard?: string;
  audioNarration?: string;
}): Omit<GeminiExplanationOutput, 'mode'> {
  return {
    model: 'gemini-3.5-flash',
    experience: 'gemini-explanation',
    modalities: GEMINI_EXPLANATION_MODALITIES,
    textSummary: input.textSummary ?? input.spokenText,
    videoStoryboard: input.videoStoryboard ?? input.visualCue,
    audioNarration: input.audioNarration ?? input.spokenText,
    spokenText: input.spokenText,
    visualCue: input.visualCue,
    followUpPrompt: input.followUpPrompt,
    safetyNote: input.safetyNote,
  };
}

const MOCK_EXPLANATIONS: Record<string, Omit<GeminiExplanationOutput, 'mode'>> = {
  'disease-mechanism': asGeminiExplanation({
    spokenText:
      '大動脈は心臓から全身へ血液を送る太い血管です。今はその内側が裂け、血液が壁の中に入り込んでいます。破裂や血流障害を防ぐため、状況を急いで共有します。',
    visualCue: '大動脈の裂け目を赤いラインで示し、血液が壁内に入り込む図解',
    followUpPrompt: 'いま大動脈で何が起きているかを、ご自身の言葉で説明できますか。',
    safetyNote: '疑問が残る場合は次の質問・理解確認画面で記載してください。',
  }),
  'emergency-surgery-need': asGeminiExplanation({
    spokenText:
      'A型大動脈解離は、時間が経つほど命に関わる危険が高まります。薬だけで待つのではなく、緊急手術で破裂や血流障害を防ぐ必要があります。',
    visualCue: '時間経過と破裂リスク上昇、緊急手術で危険部位を治療する流れ',
    followUpPrompt: 'なぜ今すぐ手術が必要なのか、待つ危険と合わせて説明できますか。',
    safetyNote: '疑問が残る場合は次の質問・理解確認画面で記載してください。',
  }),
  'procedure-and-risks': asGeminiExplanation({
    spokenText:
      '予定される緊急人工血管置換では、解離の広がりに応じて上行置換、ヘミアーチ置換、部分弓部置換、全弓部置換、全弓部置換＋FETなどから必要な範囲を選びます。人工心肺を使用し、出血、脳梗塞、腎不全、死亡などの重大なリスクに備えます。',
    visualCue: '人工血管置換の模式図と、合併症リスクを医師確認項目として表示',
    followUpPrompt: '手術の内容と、医師に確認したい主なリスクを挙げられますか。',
    safetyNote: '疑問が残る場合は次の質問・理解確認画面で記載してください。',
  }),
};

export function getMockGeminiExplanation(input: GeminiExplanationInput): GeminiExplanationOutput {
  const explanation = MOCK_EXPLANATIONS[input.checkpointId] ?? MOCK_EXPLANATIONS['disease-mechanism'];
  return {
    mode: 'mock',
    ...explanation,
  };
}

export const mockGeminiExplanationAdapter: GeminiExplanationAdapter = {
  async generateExplanation(input: GeminiExplanationInput): Promise<GeminiExplanationOutput> {
    return getMockGeminiExplanation(input);
  },
};

export function createGeminiExplanationAdapter(options: GeminiExplanationAdapterOptions = {}): GeminiExplanationAdapter {
  if (!options.geminiApiKey && !options.backendEndpoint) {
    return mockGeminiExplanationAdapter;
  }

  // Hackathon MVP keeps deterministic mock fallback even when credentials are configured.
  // Swap this implementation with a Vercel API Route / Vertex AI backend after the demo is stable.
  return mockGeminiExplanationAdapter;
}
