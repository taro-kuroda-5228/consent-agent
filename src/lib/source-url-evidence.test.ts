import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSourceUrlTextCache, extractSourceUrlText } from "./source-url-evidence";
import { InMemoryConsentSessionRepository } from "./repositories/in-memory-consent-session-repository";

describe("source URL full-text cache for per-question QA extraction", () => {
  const sourceUrl = "https://example.org/facility-guideline-notes.txt";
  const sourceBody =
    "急性A型大動脈解離では緊急手術を含む迅速な治療判断が重要。手術の合併症として死亡、脳梗塞、腎不全、出血が説明対象となる。透析が必要になる場合もある。";
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearSourceUrlTextCache();
    fetchMock = vi.fn(async () =>
      new Response(sourceBody, { headers: { "content-type": "text/plain; charset=utf-8" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSourceUrlTextCache();
  });

  it("downloads and parses the same source only once across multiple family questions", async () => {
    const first = await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？");
    const second = await extractSourceUrlText(sourceUrl, "透析が必要になりますか？");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.extractedText).toContain("脳梗塞");
    expect(second.extractedText).toContain("透析");
    expect(second.fileName).toBe("facility-guideline-notes.txt");
  });

  it("fetches the source again after the cache is cleared", async () => {
    await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？");
    clearSourceUrlTextCache();
    await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prioritizes dialysis/renal chunks over PDF table-of-contents and reference noise", async () => {
    const text = [
      "目次 第1章 総論 第2章 治療 References PMID 111 PMID 222 文献 文献 文献",
      "術後合併症の章では、急性腎障害（AKI）と一時的または恒久的な透析が必要になる場合について説明する。",
      "References 1 2 3 4 5 6 7 8 9 10 PMID 333 PMID 444",
    ].join("\n\n");
    fetchMock.mockResolvedValue(new Response(text, { headers: { "content-type": "text/plain" } }));

    const result = await extractSourceUrlText(sourceUrl, "透析が必要になりますか？");

    expect(result.extractedText).toContain("透析");
    expect(result.extractedText).not.toMatch(/References 1 2 3/);
  });

  it("reuses repository-stored source chunks after instance cache is cleared", async () => {
    const repo = new InMemoryConsentSessionRepository();
    await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？", repo);
    clearSourceUrlTextCache();
    const second = await extractSourceUrlText(sourceUrl, "透析が必要になりますか？", repo);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.extractedText).toContain("透析");
    await expect(repo.getSourceDocumentCache(sourceUrl)).resolves.toMatchObject({
      sourceUrl,
      fileName: "facility-guideline-notes.txt",
      chunks: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("透析") })]),
    });
  });

  it("does not cache failed source fetches", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("not found", { status: 404 }));

    await expect(extractSourceUrlText(sourceUrl, "")).rejects.toThrow("source fetch failed");
    const recovered = await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recovered.extractedText).toContain("脳梗塞");
  });
});
