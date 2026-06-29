import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

describe("hackathon README", () => {
  it("explains the judged demo path and safety boundary", () => {
    expect(readme).toContain("Judge demo path");
    expect(readme).toContain("physician-selected evidence");
    expect(readme).toContain("AI does not obtain final consent");
  });

  it("explains AI-mediated consent and the grounding eval merge gate", () => {
    expect(readme).toContain("AI-mediated consent");
    expect(readme).toContain("consent_ready");
    expect(readme).toContain("needs_physician_followup");
    expect(readme).toContain("Grounding evaluation & CI gate");
    expect(readme).toContain("npm run eval");
    expect(readme).toContain("machine-verified citation badge");
  });

  it("documents the application-ready evidence search architecture without presenting disease-specific hard-coding", () => {
    const path = join(process.cwd(), "docs/clinical-evidence-search-architecture.md");
    expect(existsSync(path)).toBe(true);
    const doc = readFileSync(path, "utf8");

    expect(doc).toContain("Structured clinical query");
    expect(doc).toContain("topic-level clinical relevance ranking");
    expect(doc).toContain("regression fixture");
    expect(doc).toContain("Supervised reranker / distillation is intentionally deferred until after application launch");
    expect(doc).not.toMatch(/ARDS専用ルール|PMID除外リスト|hard-coded disease rule/i);
  });
});
