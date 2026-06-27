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
    const card = cards[0];
    expect(card).toBeDefined();
    if (!card) throw new Error("expected PubMed evidence card");
    expect(card).toMatchObject({
      evidenceId: "PUBMED-12345678",
      pmid: "12345678",
      sourceType: "Review",
      origin: "medevidence-rag",
      retrievalStatus: "pubmed-verified",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    });
    expect(card.title).toContain("Dialysis-requiring acute kidney injury");
    expect(card.clinicianSummary).toBeDefined();
    expect(card.clinicianSummary).toContain("8.2%");
    expect(card.clinicianSummary?.length).toBeLessThanOrEqual(140);
    expect(card.clinicianSummary).not.toContain("について言及している論文");
    expect(card.keyFindings?.[0]).toBe("Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.");
    expect(card.displayForFamily).toContain("選択したPubMed論文では");
    expect(card.citation).toContain("PMID: 12345678");
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

  it("keeps physician summaries and key findings compact on mobile", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "36036431",
        title: "Risk factors for acute kidney injury after Stanford type A aortic dissection repair surgery: a systematic review and meta-analysis.",
        abstractText: "The synthesized incidence of postoperative AKI was 50.7%. Risk factors for AKI included cardiopulmonary bypass (CPB) time >180 min [odds ratio (OR), 4.89, 95% confidence interval (CI), 2.06-11.61, I2 = 0%], prolonged operative time (>7 h) (OR, 2.73, 95% CI, 1.95-3.82, I2 = 0), advanced age (per 10 years) (OR, 1.34, 95% CI, 1.21-1.49, I2 = 0), increased packed red blood cells (pRBCs) transfusion perioperatively (OR, 1.09, 95% CI, 1.07-1.11, I2 = 42%), elevated body mass index (per 5 kg/m2) (OR, 1.23, 95% CI, 1.18-1.28, I2 = 42%) and preoperative kidney injury (OR, 3.61, 95% CI, 2.48-5.28, I2 = 45%). The in-hospital or 30-day mortality was higher in patients with postoperative AKI than in that without AKI [risk ratio (RR), 3.12, 95% CI, 2.54-3.85, p < 0.01]. Conclusions: AKI after TAAD repair increased the in-hospital or 30-day mortality. Reducing CPB time and pRBCs transfusion, especially in elderly or heavier weight patients, or patients with preoperative kidney injury were important to prevent AKI after TAAD repair surgery.",
        journal: "Renal failure",
        year: "2022",
        authors: ["Wang X"],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて", outcomeTags: ["renal-failure", "dialysis"] });

    const card = cards[0];
    expect(card.clinicianSummary).toBeDefined();
    expect(card.clinicianSummary?.length).toBeLessThanOrEqual(140);
    expect(card.clinicianSummary).toContain("術後AKI");
    expect(card.clinicianSummary).toContain("50.7%");
    expect(card.clinicianSummary).not.toContain("The synthesized incidence");
    expect(card.keyFindings?.length).toBeLessThanOrEqual(3);
    expect(card.keyFindings?.every((finding) => finding.length <= 180)).toBe(true);
  });

  it("keeps the no-abstract fallback summary compact even for long queries", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "noabstract",
        title: "Acute kidney injury after aortic dissection repair without abstract",
        abstractText: "",
        journal: "PubMed",
        year: "2026",
        authors: [],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文をできるだけ詳しく探して、医師が説明に使えるものだけを表示してほしい", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards[0].clinicianSummary).toBe("PubMed候補。abstractを医師が確認してください。");
    expect(cards[0].clinicianSummary?.length).toBeLessThanOrEqual(60);
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
