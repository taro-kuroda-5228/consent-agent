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
});
