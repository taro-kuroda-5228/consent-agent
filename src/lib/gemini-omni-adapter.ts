export interface OmniExplanationInput {
  caseId: string;
  checkpointId: string;
  audience: 'patient_family' | 'physician';
  language: 'ja';
}

export interface OmniExplanationOutput {
  mode: 'mock' | 'gemini';
  model: 'gemini-omni';
  modalities: Array<'text' | 'video' | 'audio'>;
  spokenText: string;
  visualCue: string;
  videoStoryboard: string;
  audioNarration: string;
  textSummary: string;
  followUpPrompt: string;
  safetyNote: string;
}

export interface GeminiOmniAdapter {
  generateExplanation(input: OmniExplanationInput): Promise<OmniExplanationOutput>;
}

export interface GeminiOmniAdapterOptions {
  geminiApiKey?: string;
  backendEndpoint?: string;
}

const GEMINI_OMNI_MODALITIES: OmniExplanationOutput['modalities'] = ['text', 'video', 'audio'];

function asGeminiOmniExplanation(input: Omit<OmniExplanationOutput, 'mode' | 'model' | 'modalities' | 'videoStoryboard' | 'audioNarration' | 'textSummary'> & {
  textSummary?: string;
  videoStoryboard?: string;
  audioNarration?: string;
}): Omit<OmniExplanationOutput, 'mode'> {
  return {
    model: 'gemini-omni',
    modalities: GEMINI_OMNI_MODALITIES,
    textSummary: input.textSummary ?? input.spokenText,
    videoStoryboard: input.videoStoryboard ?? input.visualCue,
    audioNarration: input.audioNarration ?? input.spokenText,
    spokenText: input.spokenText,
    visualCue: input.visualCue,
    followUpPrompt: input.followUpPrompt,
    safetyNote: input.safetyNote,
  };
}

const MOCK_EXPLANATIONS: Record<string, Omit<OmniExplanationOutput, 'mode'>> = {
  'disease-mechanism': asGeminiOmniExplanation({
    spokenText:
      '大動脈は心臓から全身へ血液を送る太い血管です。今はその内側が裂け、血液が壁の中に入り込んでいます。破裂や血流障害を防ぐため、状況を急いで共有します。',
    visualCue: '大動脈の裂け目を赤いラインで示し、血液が壁内に入り込む図解',
    followUpPrompt: 'いま大動脈で何が起きているかを、ご自身の言葉で説明できますか。',
    safetyNote: 'デモ用。実臨床では医師確認が必要です。AIは署名済み同意を代替しません。',
  }),
  'emergency-surgery-need': asGeminiOmniExplanation({
    spokenText:
      'A型大動脈解離は、時間が経つほど命に関わる危険が高まります。薬だけで待つのではなく、緊急手術で破裂や血流障害を防ぐ必要があります。',
    visualCue: '時間経過と破裂リスク上昇、緊急手術で危険部位を治療する流れ',
    followUpPrompt: 'なぜ今すぐ手術が必要なのか、待つ危険と合わせて説明できますか。',
    safetyNote: 'デモ用。実臨床では医師確認が必要です。AIは治療選択を決定しません。',
  }),
  'procedure-and-risks': asGeminiOmniExplanation({
    spokenText:
      '予定される上行大動脈人工血管置換術では、裂けた重要部分を人工血管に置き換えます。出血、脳梗塞、腎不全、死亡などの重大なリスクは医師が個別に確認します。',
    visualCue: '人工血管置換の模式図と、合併症リスクを医師確認項目として表示',
    followUpPrompt: '手術の内容と、医師に確認したい主なリスクを挙げられますか。',
    safetyNote: 'デモ用。実臨床では医師確認が必要です。個別予後は医師にエスカレーションします。',
  }),
};

export function getMockOmniExplanation(input: OmniExplanationInput): OmniExplanationOutput {
  const explanation = MOCK_EXPLANATIONS[input.checkpointId] ?? MOCK_EXPLANATIONS['disease-mechanism'];
  return {
    mode: 'mock',
    ...explanation,
  };
}

export const mockGeminiOmniAdapter: GeminiOmniAdapter = {
  async generateExplanation(input: OmniExplanationInput): Promise<OmniExplanationOutput> {
    return getMockOmniExplanation(input);
  },
};

export function createGeminiOmniAdapter(options: GeminiOmniAdapterOptions = {}): GeminiOmniAdapter {
  if (!options.geminiApiKey && !options.backendEndpoint) {
    return mockGeminiOmniAdapter;
  }

  // Hackathon MVP keeps deterministic mock fallback even when credentials are configured.
  // Swap this implementation with a Vercel API Route / Vertex AI backend after the demo is stable.
  return mockGeminiOmniAdapter;
}
