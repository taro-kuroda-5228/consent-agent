import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const pageSource = readSource("src/app/page.tsx");
const visibleAppSources = [
  pageSource,
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

  it("keeps bottom handoff CTAs readable on mobile by pinning text colors", () => {
    expect(pageSource).toContain("📋 JSONコピー");
    expect(pageSource).toContain("📤 eConsent送信");
    expect(pageSource).toContain("📝 説明完了として記録");
    expect(pageSource).toContain("border-slate-300 bg-white text-sm font-bold text-slate-900");
    expect(pageSource).toContain("bg-blue-600 text-sm font-bold text-white");
    expect(pageSource).toContain("bg-green-600 text-sm font-bold text-white");
    expect(pageSource).toContain("disabled:opacity-100");
  });

  it("shows evidence sufficiency and override warning copy before family explanation", () => {
    expect(pageSource).toContain("根拠カバレッジ: 説明開始可能");
    expect(pageSource).toContain("根拠カバレッジ: 不足あり");
    expect(pageSource).toContain("不足トピック");
    expect(pageSource).toContain("医師overrideで開始");
    expect(pageSource).not.toContain("selectedEvidenceIds.length > 0 ? selectedEvidenceIds : getDefaultSelectedEvidenceIds()");
  });

  it("labels quick questions as realistic family questions rather than judge samples", () => {
    expect(pageSource).toContain("よくある家族の質問");
    expect(pageSource).toContain("急いで同意しないといけませんか？");
    expect(pageSource).toContain("どの質問も医師選択済み根拠だけで回答します");
    expect(pageSource).not.toContain("サンプル質問");
    expect(pageSource).not.toContain("judge sample");
  });

  it("explains that the physician summary export includes understanding, questions, and evidence IDs", () => {
    expect(pageSource).toContain("医師サマリー export");
    expect(pageSource).toContain("家族が理解できたこと");
    expect(pageSource).toContain("追加説明が必要なこと");
    expect(pageSource).toContain("家族から出た質問");
    expect(pageSource).toContain("回答に使った根拠ID");
  });
});
