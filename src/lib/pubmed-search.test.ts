import { describe, expect, it } from "vitest";
import {
  buildPubMedNaturalLanguageSearch,
  convertPubMedArticlesToEvidenceCards,
  parsePubMedEFetchXml,
} from "./pubmed-search";

const dialysisXml = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345678</PMID>
      <Article>
        <ArticleTitle>Dialysis-requiring acute kidney injury after surgery for acute type A aortic dissection</ArticleTitle>
        <Journal><Title>Journal of Cardiothoracic Surgery</Title><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>
        <Abstract>
          <AbstractText>Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.</AbstractText>
          <AbstractText>Dialysis-requiring renal failure was associated with increased early mortality.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author><LastName>Sato</LastName><Initials>T</Initials></Author>
          <Author><LastName>Smith</LastName><Initials>J</Initials></Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

describe("PubMed natural-language evidence search", () => {
  it("expands a Japanese content query into a PubMed query for dissection and dialysis risk", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離の透析リスクについて言及している論文");

    expect(plan.originalQuery).toBe("大動脈解離の透析リスクについて言及している論文");
    expect(plan.pubmedTerm).toContain("aortic dissection");
    expect(plan.pubmedTerm).toContain("dialysis");
    expect(plan.pubmedTerm).toContain("renal failure");
    expect(plan.explainForDoctor).toContain("透析");
    expect(plan.outcomeTags).toEqual(expect.arrayContaining(["renal-failure", "dialysis"]));
  });

  it("turns PubMed XML results into physician-reviewable evidence cards", () => {
    const articles = parsePubMedEFetchXml(dialysisXml);
    const cards = convertPubMedArticlesToEvidenceCards(articles, {
      originalQuery: "大動脈解離の透析リスクについて言及している論文",
      outcomeTags: ["renal-failure", "dialysis"],
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      evidenceId: "PUBMED-12345678",
      pmid: "12345678",
      sourceType: "Review",
      origin: "medevidence-rag",
      retrievalStatus: "pubmed-verified",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    });
    expect(cards[0].title).toContain("Dialysis-requiring acute kidney injury");
    expect(cards[0].clinicianSummary).toContain("8.2%");
    expect(cards[0].keyFindings).toEqual(expect.arrayContaining([
      "Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.",
    ]));
    expect(cards[0].displayForFamily).toContain("選択したPubMed論文では");
    expect(cards[0].citation).toContain("PMID: 12345678");
  });

  it("strips encoded HTML tags from PubMed abstract snippets", () => {
    const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>9</PMID><Article><ArticleTitle>Acute kidney injury after acute type A aortic dissection</ArticleTitle><Journal><Title>Renal failure</Title><JournalIssue><PubDate><Year>2022</Year></PubDate></JournalIssue></Journal><Abstract><AbstractText>&lt;b&gt;Background:&lt;/b&gt; Acute kidney injury occurred after acute type A aortic dissection repair.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
    const cards = convertPubMedArticlesToEvidenceCards(parsePubMedEFetchXml(xml), {
      originalQuery: "大動脈解離の透析リスクについて言及している論文",
      outcomeTags: ["renal-failure", "dialysis"],
    });

    expect(cards[0].clinicianSummary).toContain("Background: Acute kidney injury");
    expect(cards[0].clinicianSummary).not.toContain("<b>");
  });

  it("filters PubMed retraction notices out of physician-selectable evidence", () => {
    const articles = [
      { pmid: "1", title: "Retraction.", abstractText: "Retraction notice.", journal: "PubMed", year: "2024", authors: [] },
      { pmid: "2", title: "Renal outcomes after aortic dissection repair", abstractText: "Dialysis was required in 6% of patients.", journal: "Aorta", year: "2024", authors: [] },
    ];
    const cards = convertPubMedArticlesToEvidenceCards(articles, { originalQuery: "透析", outcomeTags: ["dialysis"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-2"]);
    expect(cards[0].title).not.toMatch(/retraction/i);
  });

  it("ranks directly answer-bearing dialysis and aortic-dissection papers over weak perioperative matches", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "weak",
        title: "Perioperative hypertensive emergencies.",
        abstractText: "Aortic dissection can cause perioperative emergency. Renal failure is mentioned as a general complication.",
        journal: "Anesth Clin",
        year: "2019",
        authors: [],
      },
      {
        pmid: "strong",
        title: "Dialysis-requiring acute kidney injury after surgery for acute type A aortic dissection",
        abstractText: "Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.",
        journal: "Aorta",
        year: "2024",
        authors: [],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-strong", "PUBMED-weak"]);
    expect(cards[0].clinicianSummary).toContain("8.2%");
  });
});
