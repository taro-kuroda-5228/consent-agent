import { readFileSync } from "node:fs";
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
});
