import { describe, expect, it } from "vitest";
import {
  buildPubMedNaturalLanguageSearch,
  convertPubMedArticlesToEvidenceCards,
  parseClinicalQuery,
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
  it("structures natural-language clinical questions without hard-coding a disease-specific mode", () => {
    const clinicalQuery = parseClinicalQuery("大動脈解離術後ARDSのリスク");

    expect(clinicalQuery.conditionConcepts).toEqual(expect.arrayContaining(["acute aortic dissection"]));
    expect(clinicalQuery.outcomeConcepts).toEqual(expect.arrayContaining(["acute respiratory distress syndrome"]));
    expect(clinicalQuery.timingConcepts).toEqual(expect.arrayContaining(["postoperative", "perioperative"]));
    expect(clinicalQuery.questionType).toBe("risk");
    expect(clinicalQuery.relevanceStrategy).toBe("topic-level-clinical-relevance");
    expect(clinicalQuery.futureModelPlan).toContain("supervised reranker after clinician feedback");
  });

  it("reports the PubMed search as structured relevance ranking rather than special-case rules", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離術後ARDSのリスク");

    expect(plan.clinicalQuery.outcomeConcepts).toContain("acute respiratory distress syndrome");
    expect(plan.rankingPolicy).toContain("directly answers the structured clinical question");
    expect(plan.evaluationPolicy).toContain("regression fixture");
    expect(JSON.stringify(plan)).not.toMatch(/ardsSpecialCase|excludePmid|hard.?coded/i);
  });

  it("expands a Japanese content query into a PubMed query for dissection and dialysis risk", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離の透析リスクについて言及している論文");

    expect(plan.originalQuery).toBe("大動脈解離の透析リスクについて言及している論文");
    expect(plan.pubmedTerm).toContain("aortic dissection");
    expect(plan.pubmedTerm).toContain("dialysis");
    expect(plan.pubmedTerm).toContain("renal failure");
    expect(plan.explainForDoctor).toContain("透析");
    expect(plan.outcomeTags).toEqual(expect.arrayContaining(["renal-failure", "dialysis"]));
  });

  it("expands bowel ischemia queries into mesenteric ischemia and visceral malperfusion terms", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離の腸管虚血リスクについて言及している論文");

    expect(plan.pubmedTerm).toContain("aortic dissection");
    expect(plan.pubmedTerm).toContain("mesenteric ischemia");
    expect(plan.pubmedTerm).toContain("bowel ischemia");
    expect(plan.pubmedTerm).toContain("visceral malperfusion");
    expect(plan.pubmedTerm).not.toContain("dialysis");
    expect(plan.explainForDoctor).toContain("腸管虚血");
    expect(plan.outcomeTags).toEqual(expect.arrayContaining(["mesenteric-ischemia", "visceral-malperfusion"]));
  });

  it("expands postoperative ARDS queries into respiratory complication terms", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離術後ARDSのリスク");

    expect(plan.pubmedTerm).toContain("aortic dissection");
    expect(plan.pubmedTerm).toContain("ARDS");
    expect(plan.pubmedTerm).toContain("acute respiratory distress syndrome");
    expect(plan.pubmedTerm).toContain("postoperative pulmonary complication");
    expect(plan.explainForDoctor).toContain("ARDS");
    expect(plan.outcomeTags).toEqual(expect.arrayContaining(["ards", "respiratory-complication"]));
  });

  it("expands tracheostomy queries instead of falling back to broad dissection outcomes", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離の気管切開リスクについて言及している論文");

    expect(plan.pubmedTerm).toContain("aortic dissection");
    expect(plan.pubmedTerm).toContain("tracheostomy");
    expect(plan.pubmedTerm).toContain("prolonged mechanical ventilation");
    expect(plan.pubmedTerm).not.toBe('(aortic dissection[Title/Abstract] OR acute type A aortic dissection[Title/Abstract] OR ATAAD[Title/Abstract]) AND (risk[Title/Abstract] OR outcome[Title/Abstract] OR postoperative[Title/Abstract] OR complication[Title/Abstract]) NOT (retraction[Publication Type] OR retraction[Title])');
    expect(plan.explainForDoctor).toContain("気管切開");
    expect(plan.outcomeTags).toEqual(expect.arrayContaining(["tracheostomy", "prolonged-ventilation"]));
  });

  it("expands a representative outcome matrix beyond the initially reported words", () => {
    const cases = [
      { query: "大動脈解離術後の脊髄虚血リスクについて言及している論文", terms: ["spinal cord ischemia", "paraplegia"], tags: ["spinal-cord-ischemia"] },
      { query: "大動脈解離術後の再開胸リスクについて言及している論文", terms: ["reoperation", "re-exploration"], tags: ["reoperation", "bleeding"] },
      { query: "大動脈解離術後のICU滞在期間について言及している論文", terms: ["intensive care unit", "ICU length of stay"], tags: ["icu-stay"] },
      { query: "大動脈解離術後感染リスクについて言及している論文", terms: ["infection", "pneumonia"], tags: ["infection"] },
    ];

    for (const testCase of cases) {
      const plan = buildPubMedNaturalLanguageSearch(testCase.query);
      expect(plan.pubmedTerm).toContain("aortic dissection");
      for (const term of testCase.terms) expect(plan.pubmedTerm).toContain(term);
      expect(plan.outcomeTags).toEqual(expect.arrayContaining(testCase.tags));
      expect(plan.rankingPolicy).toContain("answerability");
    }
  });

  it("uses a generic answerability gate for unseen outcome wording instead of returning broad ATAAD papers", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離術後の脊髄虚血リスクについて言及している論文");
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "weak-mortality-registry",
        title: "Mortality in acute type A aortic dissection - A systematic review based on contemporary registries.",
        abstractText: "We included registry-based studies reporting in-hospital, 30-day, operative or 48-hour mortality following ATAAD. In-hospital mortality ranged from 5% to 29%.",
        journal: "Registry review",
        year: "2025",
        authors: [],
      },
      {
        pmid: "weak-stroke-list",
        title: "Neurological complications after acute type A aortic dissection repair.",
        abstractText: "Stroke occurred in 12% of cases. The outcome list included renal failure, respiratory failure, and spinal cord ischemia as collected variables, without incidence or risk factor results for spinal cord ischemia.",
        journal: "Aorta",
        year: "2024",
        authors: [],
      },
      {
        pmid: "direct-spinal-cord",
        title: "Spinal cord ischemia after acute type A aortic dissection repair: incidence and risk factors.",
        abstractText: "Among patients undergoing acute type A aortic dissection repair, spinal cord ischemia occurred in 2.4%. Predictors included prolonged circulatory arrest and extensive arch repair.",
        journal: "Journal of aortic surgery",
        year: "2024",
        authors: ["Ito K"],
      },
    ], { originalQuery: plan.originalQuery, outcomeTags: plan.outcomeTags });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-direct-spinal-cord"]);
    expect(cards[0].clinicianSummary).toContain("脊髄虚血");
    expect(cards[0].clinicianSummary).toContain("2.4%");
    expect(cards[0].clinicianSummary).not.toMatch(/^要点: We included/);
  });

  it("omits etiologic infection papers when the clinician asks for postoperative infection risk", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離術後感染リスクについて言及している論文");
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "weak-infection-cause",
        title: "Chronic Q fever infection associated with acute aortic dissection.",
        abstractText: "Chronic Q fever infection is associated with cardiovascular complications and can present with aortic dissection. This paper discusses infectious etiology, not postoperative infection after repair.",
        journal: "Infection",
        year: "2011",
        authors: [],
      },
      {
        pmid: "direct-postoperative-infection",
        title: "Postoperative infection after acute type A aortic dissection repair: incidence and risk factors.",
        abstractText: "Among patients undergoing acute type A aortic dissection repair, postoperative infection occurred in 8.1%. Risk factors included prolonged operative time and transfusion.",
        journal: "Aorta",
        year: "2024",
        authors: ["Kato M"],
      },
    ], { originalQuery: plan.originalQuery, outcomeTags: plan.outcomeTags });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-direct-postoperative-infection"]);
    expect(cards[0].clinicianSummary).toContain("感染");
    expect(cards[0].clinicianSummary).toContain("8.1%");
  });

  it("ranks directly answer-bearing postoperative ARDS papers and summarizes clinical risk", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "weak-stroke",
        title: "Postoperative stroke in acute type A aortic dissection: incidence, outcomes, and perioperative risk factors.",
        abstractText: "Postoperative stroke occurred in 13.6% of patients and was associated with significant extension of dissection.",
        journal: "Aorta",
        year: "2025",
        authors: [],
      },
      {
        pmid: "weak-composite",
        title: "Effects of dexmedetomidine on surgery for type A acute aortic dissection outcome.",
        abstractText: "The in-hospital mortality and composite outcome including all-cause mortality, acute kidney injury, delirium, postoperative atrial fibrillation, and respiratory failure, were considered primary outcomes. The risk of Acute Kidney Injury Network stage 3 acute kidney injury was significantly lower in the dexmedetomidine group.",
        journal: "Medicine",
        year: "2022",
        authors: [],
      },
      {
        pmid: "weak-covid-pandemic",
        title: "Acute type A aortic dissection patients undergoing surgical repair during the COVID-19 pandemic.",
        abstractText: "Meta-analysis showed that either the composite incidence of mortality and morbidities or individual morbidity was comparable between two groups, except that more patients developed pneumonia. Literature reviews of published cases reported hypoxia, endotracheal re-intubation, respiratory failure, renal failure, coagulopathy, multi-organ failure and shock. ATAAD patients with concomitant COVID-19 infection had a high risk of mortality and morbidities.",
        journal: "Medicine",
        year: "2025",
        authors: [],
      },
      {
        pmid: "weak-prehospital-death",
        title: "CT findings of type A acute aortic dissection that did and did not result in prehospital death.",
        abstractText: "The patients were divided into those that did and did not suffer prehospital death. Bloody pericardial effusion and lung consolidation were significant risk factors for prehospital death. Secondary respiratory failure might contribute to prehospital death in such cases.",
        journal: "Medicine",
        year: "2022",
        authors: [],
      },
      {
        pmid: "weak-general-reoperation",
        title: "Aortic dissection after previous cardiovascular surgery.",
        abstractText: "This study assesses early and late outcomes of reoperations. Hospital mortality was 6%, stroke 4%, renal failure 2%, and respiratory failure 7%. Aortic dissection after cardiovascular surgery is rare and can be managed with acceptable operative risks.",
        journal: "Journal of thoracic and cardiovascular surgery",
        year: "2004",
        authors: [],
      },
      {
        pmid: "weak-registry-definition",
        title: "Aortic arch registry of type a aortic dissection (AoArch) - rationale, design and definition criteria.",
        abstractText: "We will define secondary outcomes as permanent neurologic deficit, the need for new dialysis, respiratory failure, a composite endpoint of mortality and major complications, and reintervention. This registry describes rationale and design definitions for type A aortic dissection repair.",
        journal: "Trials",
        year: "2026",
        authors: [],
      },
      {
        pmid: "weak-aortic-arch-repair-cohort",
        title: "Fenestrated and Branched Endovascular Aortic Arch Repair Outcomes in Female Patients: A Retrospective Multicentre Analysis.",
        abstractText: "Data on females managed with fenestrated or branched endovascular aortic arch repair are limited. The aortic dissection rate was 38.5%. Thirty-day mortality, stroke, respiratory failure, and renal failure were captured as outcomes.",
        journal: "Annals",
        year: "2025",
        authors: [],
      },
      {
        pmid: "weak-thoracoabdominal-aneurysm-tracheostomy",
        title: "Tracheostomy After Thoracoabdominal Aortic Aneurysm Repair: Risk Factors and Outcomes.",
        abstractText: "Extensive repairs were performed in 716 patients. Tracheostomy was necessary in 11.1%. Operative mortality was higher in patients with tracheostomy. Acute type A aortic dissection was listed only in baseline history, not as the study focus.",
        journal: "Annals",
        year: "2019",
        authors: [],
      },
      {
        pmid: "41388298",
        title: "Development and validation of a predictive model for postoperative acute respiratory distress syndrome in patients with type A aortic dissection based on the 2023 updated definition.",
        abstractText: "Acute respiratory distress syndrome (ARDS) is a common complication after type A aortic dissection surgery and often leads to worsened clinical outcomes for patients. A retrospective analysis was conducted on the clinical data of 423 patients who were diagnosed with type A aortic dissection and who underwent surgery. The predictive model included oxygenation impairment, inflammatory markers, cardiopulmonary bypass time, and blood transfusion.",
        journal: "Journal of cardiothoracic surgery",
        year: "2025",
        authors: ["Li X"],
      },
      {
        pmid: "37773789",
        title: "Postoperative pulmonary complications in patients undergoing aortic surgery: A single-center retrospective study.",
        abstractText: "Postoperative pulmonary complications (PPCs) are among the most common complications after cardiovascular surgery. This study aimed to explore the real incidence of and risk factors for PPC in patients with acute type A aortic dissection (ATAAD) who underwent total aortic arch replacement combined with frozen elephant trunk. The incidence of PPCs was 32.8%. Risk factors included mechanical ventilation time, transfusion, and cardiopulmonary bypass.",
        journal: "Frontiers",
        year: "2023",
        authors: ["Chen Y"],
      },
    ], { originalQuery: "大動脈解離術後ARDSのリスク", outcomeTags: ["ards", "respiratory-complication"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-41388298", "PUBMED-37773789"]);
    expect(cards[0].clinicianSummary).toContain("TAAD術後ARDS");
    expect(cards[0].clinicianSummary).toContain("予測モデル");
    expect(cards[0].clinicianSummary).toMatch(/酸素化障害|炎症反応|CPB|輸血/);
    expect(cards[0].clinicianSummary).not.toMatch(/stroke|脳卒中/i);
    expect(cards[1].clinicianSummary).toContain("術後肺合併症");
    expect(cards[1].clinicianSummary).toContain("32.8%");
    expect(cards.every((card) => (card.clinicianSummary?.length ?? 0) <= 150)).toBe(true);
  });

  it("ranks directly answer-bearing tracheostomy papers and omits broad dissection outcomes", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "40734571",
        title: "Mortality in acute type A aortic dissection - A systematic review based on contemporary registries.",
        abstractText: "We included registry-based studies reporting in-hospital, 30-day, operative or 48-hour mortality following ATAAD. In-hospital mortality was reported in 13 registries with rates ranging from 5% to 29%.",
        journal: "Romanian journal of internal medicine",
        year: "2025",
        authors: ["Matei R"],
      },
      {
        pmid: "39076744",
        title: "Systematic Review of the Management of Acute Type A Aortic Dissection with Mesenteric Malperfusion.",
        abstractText: "A total of 352 patients diagnosed with aTAAD complicated with MMP were included with an overall prevalence of 4%. The overall in-hospital mortality amongst these patients was 43.5%, and bowel necrosis and/or multiorgan failure were the major causes of death.",
        journal: "Reviews in cardiovascular medicine",
        year: "2023",
        authors: ["Wang J"],
      },
      {
        pmid: "37333431",
        title: "Inflammatory risk stratification individualizes anti-inflammatory pharmacotherapy for acute type A aortic dissection.",
        abstractText: "The population was used to develop an inflammatory risk model to predict multiple organ dysfunction syndrome after acute type A aortic dissection.",
        journal: "Nature communications",
        year: "2023",
        authors: ["Zhang Q"],
      },
      {
        pmid: "weak-thoracoabdominal-aneurysm-tracheostomy",
        title: "Tracheostomy After Thoracoabdominal Aortic Aneurysm Repair: Risk Factors and Outcomes.",
        abstractText: "Extensive repairs were performed in 716 patients. Tracheostomy was necessary in 11.1%. Operative mortality was higher in patients with tracheostomy. Acute type A aortic dissection was listed only in baseline history, not as the study focus.",
        journal: "Annals",
        year: "2019",
        authors: [],
      },
      {
        pmid: "direct-tracheostomy-ataad",
        title: "Tracheostomy after acute type A aortic dissection repair: incidence, risk factors, and outcomes.",
        abstractText: "Among patients undergoing surgery for acute type A aortic dissection, tracheostomy was required in 9.5%. Tracheostomy was associated with pneumonia, renal failure, prolonged mechanical ventilation, and higher operative mortality.",
        journal: "Aorta",
        year: "2024",
        authors: ["Sato T"],
      },
    ], { originalQuery: "大動脈解離の気管切開リスクについて言及している論文", outcomeTags: ["tracheostomy", "prolonged-ventilation"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-direct-tracheostomy-ataad"]);
    expect(cards[0].clinicianSummary).toContain("気管切開");
    expect(cards[0].clinicianSummary).toContain("9.5%");
    expect(cards[0].clinicianSummary).toMatch(/肺合併症|腎障害/);
    expect(cards[0].clinicianSummary).not.toMatch(/^要点: We included registry-based/);
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

  it("ranks directly answer-bearing mesenteric ischemia papers and summarizes the clinical point", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "weak-renal",
        title: "Dialysis-requiring acute kidney injury after surgery for acute type A aortic dissection",
        abstractText: "Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.",
        journal: "Aorta",
        year: "2024",
        authors: [],
      },
      {
        pmid: "weak-limb",
        title: "Lower limb malperfusion in type B aortic dissection: a systematic review.",
        abstractText: "Lower limb malperfusion syndrome occurs in complicated type B aortic dissections. The review mentions mesenteric ischemia only as another vascular bed in the introduction.",
        journal: "Annals",
        year: "2014",
        authors: [],
      },
      {
        pmid: "26024781",
        title: "Mesenteric ischemia in acute aortic dissection.",
        abstractText: "Mesenteric ischemia complicated by acute aortic dissection (AAD) is uncommon, but serious, as there is no established treatment strategy and it can progress rapidly to multi-organ failure. Diagnosing mesenteric ischemia before necrotic change is difficult. The standard surgical procedures for mesenteric ischemia are prompt revascularization of the mesenteric artery and, if needed, resection of necrotic intestine.",
        journal: "Surgery today",
        year: "2016",
        authors: ["Yamashiro S"],
      },
      {
        pmid: "39848556",
        title: "Malperfusion in Patients With Acute Type A Aortic Dissection: A Nationwide Analysis.",
        abstractText: "Preoperative malperfusion occurred in 27.7% (2748 of 9958) of cases. Operative mortality was much greater among patients with malperfusion (26.8% vs 13.6%). After adjustment, mesenteric malperfusion was associated with mortality (odds ratio, 1.82; 95% CI, 1.45-2.28).",
        journal: "The Annals of thoracic surgery",
        year: "2025",
        authors: ["Smith J"],
      },
    ], { originalQuery: "大動脈解離の腸管虚血リスクについて言及している論文", outcomeTags: ["mesenteric-ischemia", "visceral-malperfusion"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-26024781", "PUBMED-39848556"]);
    expect(cards[0].clinicianSummary).toContain("重篤");
    expect(cards[0].clinicianSummary).toContain("早期診断");
    expect(cards[0].clinicianSummary).toContain("再灌流");
    expect(cards[0].clinicianSummary).not.toMatch(/^要点: Mesenteric ischemia/);
    expect(cards[1].clinicianSummary).toContain("malperfusion 27.7%");
    expect(cards[1].clinicianSummary).toContain("腸間膜malperfusion");
    expect(cards[1].clinicianSummary).toContain("死亡リスク上昇");
    expect(cards[1].clinicianSummary?.length).toBeLessThanOrEqual(150);
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

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-strong"]);
    expect(cards[0].clinicianSummary).toContain("8.2%");
  });
});
