import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSourceUrlTextCache, extractSourceUrlText } from "./source-url-evidence";

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

  it("does not cache failed source fetches", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("not found", { status: 404 }));

    await expect(extractSourceUrlText(sourceUrl, "")).rejects.toThrow("source fetch failed");
    const recovered = await extractSourceUrlText(sourceUrl, "脳梗塞のリスクはありますか？");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(recovered.extractedText).toContain("脳梗塞");
  });
});
