import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("physician evidence card UI parity", () => {
  it("renders PubMed search results and selected evidence through the same evidence decision card", () => {
    const sharedRendererUses = pageSource.match(/<EvidenceDecisionCard\b/g) ?? [];

    expect(pageSource).toContain("function EvidenceDecisionCard");
    expect(sharedRendererUses.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps selected PubMed evidence labels aligned with the PubMed search card", () => {
    expect(pageSource).toContain("PubMedで確認");
    expect(pageSource).toContain("抄録/メタデータ");
    expect(pageSource).not.toContain("PubMed検索カードは抄録・メタデータからの確認です。");
    expect(pageSource).not.toContain("長いガイドライン全文を回答根拠にする場合は、PDF/URL資料として追加してください。");
    expect(pageSource).not.toContain("出典元リンクでfact check");
    expect(pageSource).not.toContain("判定理由:");
    expect(pageSource).not.toContain("physicianReviewTierLabel &&");
    expect(pageSource).toContain("主要所見");
    expect(pageSource).toContain("outcomeTags");
  });

  it("renders already-selected PubMed evidence as adopted evidence, not as a candidate-review card", () => {
    expect(pageSource).toContain('tone="selected"');
    expect(pageSource).not.toContain('tone={item.retrievalStatus === "pubmed-verified" || item.pmid ? "pubmed-search" : "selected"}');
  });

  it("does not render candidate tier or review reason copy in evidence cards", () => {
    expect(pageSource).not.toContain('const showDecisionMetadata = tone === "pubmed-search"');
    expect(pageSource).not.toContain('showDecisionMetadata && evidence.physicianReviewTierLabel');
    expect(pageSource).not.toContain('showDecisionMetadata && evidence.physicianReviewReason');
    expect(pageSource).not.toContain("判定理由:");
  });

  it("wraps long clinical scope text inside the evidence card on mobile", () => {
    const clinicalScopeBadge = pageSource.match(/className=\"([^\"]*clinical-scope-badge[^\"]*)\"/);

    expect(clinicalScopeBadge?.[1]).toContain("block");
    expect(clinicalScopeBadge?.[1]).toContain("w-full");
    expect(clinicalScopeBadge?.[1]).toContain("min-w-0");
    expect(clinicalScopeBadge?.[1]).toContain("max-w-full");
    expect(clinicalScopeBadge?.[1]).toContain("overflow-hidden");
    expect(clinicalScopeBadge?.[1]).toContain("whitespace-normal");
    expect(clinicalScopeBadge?.[1]).toContain("break-words");
    expect(clinicalScopeBadge?.[1]).toContain("[overflow-wrap:anywhere]");
    expect(clinicalScopeBadge?.[1]).toContain("h-auto");
    expect(clinicalScopeBadge?.[1]).toContain("text-left");
  });
});
