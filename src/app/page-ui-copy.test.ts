import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const pageSource = readSource("src/app/page.tsx");
const renderScreen1Source = pageSource.slice(
  pageSource.indexOf("const renderScreen1 = () =>"),
  pageSource.indexOf("const renderScreen2 = () =>"),
);
const renderScreen2Source = pageSource.slice(
  pageSource.indexOf("const renderScreen2 = () =>"),
  pageSource.indexOf("const renderScreen3 = () =>"),
);
const familyExplanationSource = readSource("src/app/family/[caseId]/page.tsx");
const visibleAppSources = [
  pageSource,
  familyExplanationSource,
  readSource("src/app/family/[caseId]/qa/page.tsx"),
  readSource("src/app/doctor/[caseId]/summary/page.tsx"),
].join("\n");

describe("mobile demo UI copy and CTA readability", () => {
  it("does not expose provider-specific or generation-oriented wording in the user-facing UI", () => {
    expect(visibleAppSources).not.toContain("Gemini生成中");
    expect(visibleAppSources).not.toContain("MedEvidence × Gemini");
    expect(visibleAppSources).not.toContain(">Gemini<");
    expect(pageSource).not.toContain("AI候補");
    expect(pageSource).not.toContain("回答生成中");
  });

  it("keeps physician handoff CTAs simple and readable on mobile", () => {
    expect(pageSource).toContain("🧑‍⚕️ 家族の回答・AI判定を含むサマリーを開く");
    expect(pageSource).toContain("📝 医師レビューとして記録");
    expect(pageSource).toContain("bg-blue-600 py-5 text-sm font-bold text-white");
    expect(pageSource).toContain("bg-green-600 py-5 text-sm font-bold text-white");
    expect(pageSource).toContain("disabled:opacity-100");
    expect(pageSource).toContain("署名済み同意ではなく");
    expect(pageSource).not.toContain("📋 JSONコピー");
    expect(pageSource).not.toContain("FHIR JSON");
  });

  it("issues a tokenized family link with QR code after explanation starts", () => {
    expect(renderScreen2Source).toContain("家族用リンク発行済み");
    expect(renderScreen2Source).toContain("📋 リンクをコピー");
    expect(renderScreen2Source).toContain("家族用リンクのQRコード");
    expect(pageSource).toContain("/family/${sessionId}${familyToken ? `?t=${familyToken}` : \"\"}");
    expect(pageSource).toContain("sessionId: sessionId ?? undefined");
  });

  it("keeps the evidence area simple for the hackathon and does not show redundant candidate/coverage panels", () => {
    expect(pageSource).toContain("PubMedを内容でAI検索");
    expect(pageSource).toContain("日本のガイドライン・非PubMed資料URLを追加");
    expect(pageSource).toContain("選択中の根拠 {selectedEvidenceIds.length}件を確認・変更");
    expect(pageSource).not.toContain("MedEvidence根拠候補");
    expect(pageSource).not.toContain("根拠候補");
    expect(pageSource).not.toContain("/api/evidence/suggest");
    expect(pageSource).not.toContain("根拠カバレッジ: 説明開始可能");
    expect(pageSource).not.toContain("根拠カバレッジ: 不足あり");
    expect(pageSource).not.toContain("不足トピック");
    expect(pageSource).not.toContain("医師overrideで開始");
    expect(pageSource).not.toContain("selectedEvidenceIds.length > 0 ? selectedEvidenceIds : getDefaultSelectedEvidenceIds()");
  });

  it("labels quick questions as realistic family questions rather than judge samples", () => {
    expect(pageSource).toContain("よくある家族の質問");
    expect(pageSource).toContain("急いで同意しないといけませんか？");
    expect(pageSource).toContain("どの質問も医師選択済み根拠だけで回答します");
    expect(pageSource).not.toContain("サンプル質問");
    expect(pageSource).not.toContain("judge sample");
  });

  it("keeps patient AI Q&A only in the understanding check section, not in Gemini explanation", () => {
    expect(renderScreen2Source).not.toContain("<h3 className=\"text-3xl font-black text-slate-950\">質問する</h3>");
    expect(renderScreen2Source).not.toContain("よくある家族の質問");
    expect(renderScreen2Source).not.toContain("handleFreeQuestion");
    expect(renderScreen2Source).toContain("質問・理解確認へ進む");
    expect(renderScreen2Source).toContain("家族説明");
    expect(renderScreen2Source).not.toContain("Gemini Omni説明");
    expect(renderScreen2Source).not.toContain("Gemini Omni");
    expect(renderScreen2Source).not.toContain("動画・音声・字幕で順番に説明します");
    expect(renderScreen2Source).not.toContain("音声・字幕付き動画");
    expect(pageSource).not.toContain("speechSynthesis");
    expect(pageSource).not.toContain("createOscillator");
    expect(renderScreen2Source).not.toContain("data-testid=\"audio-playback-status\"");
    expect(pageSource).toContain("<CardTitle className=\"text-sm\">✏️ 自由に質問する");
  });

  it("shows the tokenized family explanation screen with video and no redundant card list", () => {
    expect(familyExplanationSource).toContain("data-testid=\"family-explanation-video\"");
    expect(familyExplanationSource).toContain("/media/aortic-dissection-explanation.mp4");
    expect(familyExplanationSource).toContain("急性A型大動脈解離の3D説明動画");
    expect(familyExplanationSource).toContain("動画と音声付き説明");
    expect(familyExplanationSource).not.toContain("view.explanation.map");
    expect(familyExplanationSource).not.toContain("section.audioNarration");
    expect(familyExplanationSource).not.toContain("🔊 聞く");
    expect(familyExplanationSource).toContain("お使いのブラウザでは動画を再生できません。");
  });

  it("makes the Gemini explanation section the real clinical AI explanation screen rather than a preview/storyboard", () => {
    expect(renderScreen2Source).not.toContain("体の中で起きていることを、動画・音声・字幕で順番に説明します");
    expect(renderScreen2Source).not.toContain("音声・字幕付き動画");
    expect(renderScreen2Source).not.toContain("3D解剖図");
    expect(renderScreen2Source).not.toContain("やさしい説明");
    expect(renderScreen2Source).not.toContain("医師確認資料に基づく");
    expect(renderScreen2Source).not.toContain("個別予後・死亡率・術式判断は担当医が補足します。AIは、医師が選んだ施設資料・論文・ガイドラインに沿って説明順序を整える補助です。");
    expect(renderScreen2Source).not.toContain("動画は急性A型大動脈解離の病態、緊急性、人工血管置換、医師補足を約50秒で説明します。");
    expect(renderScreen2Source).toContain("data-testid=\"generated-explanation-video\"");
    expect(renderScreen2Source).toContain("/media/aortic-dissection-explanation.mp4");
    expect(renderScreen2Source).not.toContain("/media/aortic-dissection-explanation.vtt");
    expect(renderScreen2Source).toContain("controls");
    expect(renderScreen2Source).toContain("playsInline");
    expect(renderScreen2Source).not.toContain("sm:grid-cols-2");
    expect(renderScreen2Source).not.toContain("根拠と安全境界");
    expect(renderScreen2Source).not.toContain("説明カードを作成しました");
    expect(renderScreen2Source).not.toContain("この動画はハッカソン用デモの補助説明です");
    expect(renderScreen2Source).not.toContain("explanation.map");
    expect(renderScreen2Source).toContain("動画を見たあと、分からないことは次の質問・理解確認でそのまま聞けます。");
    expect(renderScreen2Source).not.toContain("{card.visualId");
    expect(renderScreen2Source).not.toContain("ataad-clinical-explanation");
    expect(renderScreen2Source).not.toContain("匿名模式図:</span>");
    expect(renderScreen2Source).not.toContain("生成済み説明動画の匿名模式アニメーション");
    expect(renderScreen2Source).not.toContain("GEMINI_EXPLANATION_STORYBOARD.map");
    expect(renderScreen2Source).not.toContain("動画ストーリーボード");
    expect(renderScreen2Source).not.toContain("CT画像で");
    expect(renderScreen2Source).not.toContain("説明スクリプトを確認");
    expect(renderScreen2Source).not.toContain("プレビュー");
  });

  it("does not expose Omni-specific product copy in the physician UI", () => {
    expect(pageSource).not.toContain("Gemini Omni");
    expect(pageSource).not.toContain("gemini-omni");
    expect(pageSource).not.toContain("omni-style");
    expect(pageSource).toContain("家族説明");
    expect(pageSource).not.toContain("3D解剖図");
  });

  it("lets physicians add and delete facility templates and avoids doctor-review warnings for template answers", () => {
    expect(pageSource).toContain("新しい施設テンプレ回答を追加");
    expect(pageSource).toContain("施設テンプレ回答を追加");
    expect(pageSource).toContain("setFacilityTemplates((prev) => [...prev, template])");
    expect(pageSource).toContain("deleteFacilityTemplate");
    expect(pageSource).toContain("を施設テンプレ回答から削除");
    expect(pageSource).toContain("✅ 施設テンプレ確認済み");
    expect(pageSource).toContain("freeAnswer.requiresDoctorReview && !freeAnswer.templateReferences?.length");
  });

  it("lets physicians remove selected evidence from the evidence list, not just untick it", () => {
    expect(pageSource).toContain("deletedEvidenceIds");
    expect(pageSource).toContain("deleteEvidence");
    expect(pageSource).toContain("を根拠一覧から削除");
    expect(pageSource).toContain("setSelectedEvidenceIds((prev) => prev.filter((id) => id !== evidenceId))");
  });

  it("lets physicians search PubMed by clinical content and add readable paper cards to selected evidence", () => {
    expect(pageSource).toContain("PubMedを内容でAI検索");
    expect(pageSource).toContain("大動脈解離の透析リスクについて言及している論文");
    expect(pageSource).toContain("/api/evidence/pubmed-search");
    expect(pageSource).toContain("addPubMedEvidenceCandidate");
    expect(pageSource).toContain("患者説明用根拠に追加");
    expect(pageSource).toContain("医師向け要約");
    expect(pageSource).toContain("主要所見");
    expect(pageSource).toContain("構造化クエリ");
    expect(pageSource).toContain("主題一致ランキング");
    expect(pageSource).toContain("疾患別の固定ルールではなく");
    expect(pageSource).not.toContain("検索意図:");
    expect(pageSource).not.toContain("PubMed式:");
    expect(pageSource).not.toContain("pubMedResult.plan.pubmedTerm");
  });

  it("keeps the physician start screen simple: current case first and advanced controls collapsed", () => {
    expect(renderScreen1Source).toContain("今回の説明");
    expect(renderScreen1Source).toContain("症例を変更する");
    expect(renderScreen1Source).toContain("詳細を編集する（必要時のみ）");
    expect(renderScreen1Source).toContain("医師向け詳細設定");
    expect(renderScreen1Source).toContain("家族説明を開始");
    expect(renderScreen1Source).not.toContain("30秒で始める");
    expect(renderScreen1Source).not.toContain("最短30秒");
    expect(renderScreen1Source).not.toContain("通常は開かなくてOK");
    expect(renderScreen1Source).not.toContain("1. 症例を選ぶ");
    expect(renderScreen1Source).not.toContain("2. 根拠は自動選択");
    expect(renderScreen1Source).not.toContain("3. 家族説明を開始");
    expect(renderScreen1Source).not.toContain(" open>");
    expect(renderScreen1Source).not.toContain("border-cyan-200 bg-cyan-50 p-3\" open>");
    expect(renderScreen1Source).not.toContain("施設別テンプレ回答（医師は必要時だけ修正）\" open>");
  });

  it("keeps the QR link copy CTA readable on a light background", () => {
    expect(renderScreen2Source).toContain("家族用リンクを発行しました");
    expect(renderScreen2Source).toContain("📋 リンクをコピー");
    expect(renderScreen2Source).toContain("bg-white text-sm font-bold text-emerald-900 shadow-sm");
    expect(renderScreen2Source).not.toContain("font-mono text-xs text-slate-700 break-all");
    expect(renderScreen2Source).not.toContain("rounded-full border-emerald-300 text-sm font-bold text-emerald-900");
  });

  it("keeps the family explanation page simple: video, one sentence, then Q&A", () => {
    expect(familyExplanationSource).toContain("data-testid=\"family-friendly-summary\"");
    expect(familyExplanationSource).toContain("動画を見たあと、分からないことは次の質問・理解確認でそのまま聞けます。");
    expect(familyExplanationSource).toContain("❓ 質問・理解確認へ進む");
    expect(familyExplanationSource).not.toContain("詳しい説明を読む");
    expect(familyExplanationSource).not.toContain("説明カード");
    expect(familyExplanationSource).not.toContain("音声で聞く内容");
  });

  it("shows a physician summary focused on patient/family worries and questions", () => {
    expect(pageSource).toContain("患者・家族が残した不安と質問だけを確認します。");
    expect(pageSource).toContain("😰 患者・家族の不安");
    expect(pageSource).toContain("💬 患者・家族からの質問");
    expect(pageSource).toContain("医師補足");
    expect(pageSource).not.toContain("医師サマリー export");
    expect(pageSource).not.toContain("家族が理解できたこと");
    expect(pageSource).not.toContain("追加説明が必要なこと");
    expect(pageSource).not.toContain("回答に使った根拠ID");
  });

  it("persists the in-page family concerns handoff before opening the session doctor summary", () => {
    expect(pageSource).toContain("fetch(`/api/sessions/${sessionId}/responses`");
    expect(pageSource).toContain("answers: UNDERSTANDING_QUESTIONS.map((q) => ({ questionId: q.id, selectedIndex: understandingAnswers[q.id] }))");
    expect(pageSource).toContain("concerns: concerns.trim()");
    expect(pageSource).toContain("intent: \"undecided\"");
    expect(pageSource).toContain("familyToken: familyToken ?? undefined");
  });
});
