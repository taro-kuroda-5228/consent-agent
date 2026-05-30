import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const pageSource = readSource("src/app/page.tsx");
const renderScreen2Source = pageSource.slice(
  pageSource.indexOf("const renderScreen2 = () =>"),
  pageSource.indexOf("const renderScreen3 = () =>"),
);
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

  it("keeps physician handoff CTAs simple and readable on mobile", () => {
    expect(pageSource).toContain("📤 eConsent送信");
    expect(pageSource).toContain("📝 説明完了として記録");
    expect(pageSource).toContain("bg-blue-600 py-5 text-sm font-bold text-white");
    expect(pageSource).toContain("bg-green-600 py-5 text-sm font-bold text-white");
    expect(pageSource).toContain("disabled:opacity-100");
    expect(pageSource).not.toContain("📋 JSONコピー");
    expect(pageSource).not.toContain("FHIR JSON");
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

  it("keeps patient AI Q&A only in the understanding check section, not in Gemini Omni explanation", () => {
    expect(renderScreen2Source).not.toContain("<h3 className=\"text-3xl font-black text-slate-950\">質問する</h3>");
    expect(renderScreen2Source).not.toContain("よくある家族の質問");
    expect(renderScreen2Source).not.toContain("handleFreeQuestion");
    expect(renderScreen2Source).toContain("説明を聞いたので理解確認へ進む");
    expect(pageSource).toContain("<CardTitle className=\"text-sm\">✏️ 自由に質問する");
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
});
