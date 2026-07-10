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

  it("summarizes PMV/tracheostomy model papers as structured Japanese clinical cards instead of objective text", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "38545347",
        title: "Prediction model for prolonged mechanical ventilation after acute type A aortic dissection surgery.",
        abstractText: "This study aims to analyze the risk factors associated with prolonged mechanical ventilation after acute type A aortic dissection surgery and establish a nomogram prediction model. Multivariable analysis identified postoperative respiratory failure, renal dysfunction, and pneumonia as independent predictors of prolonged mechanical ventilation. The nomogram model showed an area under the receiver operating characteristic curve (AUC) of 0.856, with calibration and decision curve analysis indicating good clinical utility.",
        journal: "Journal of cardiothoracic surgery",
        year: "2024",
        authors: ["Chen Y"],
      },
    ], { originalQuery: "大動脈解離の気管切開リスクについて言及している論文", outcomeTags: ["tracheostomy", "prolonged-ventilation"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("長期人工呼吸");
    expect(cards[0].clinicianSummary).toContain("予測モデル");
    expect(cards[0].clinicianSummary).toContain("AUC 0.856");
    expect(cards[0].clinicianSummary).toMatch(/肺合併症|呼吸不全/);
    expect(cards[0].clinicianSummary).toContain("腎障害");
    expect(cards[0].clinicianSummary).not.toMatch(/This study aims|要点:|objective|aims to analyze/i);
    expect(cards[0].keyFindings?.join(" ")).not.toMatch(/This study aims|objective|aims to analyze/i);
    expect(cards[0].clinicianSummary?.length).toBeLessThanOrEqual(170);
  });

  it("does not leak objective-only sentences from the real PMV nomogram PubMed card", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "38545347",
        title: "Construction of a nomogram risk prediction model for prolonged mechanical ventilation in patients following surgery for acute type A aortic dissection.",
        abstractText: "This study aims to analyze the risk factors associated with prolonged mechanical ventilation (PMV) in patients following surgical treatment for acute type A aortic dissection and establish a nomogram prediction model. Multivariable analysis identified postoperative respiratory failure, renal dysfunction, and pneumonia as independent predictors of prolonged mechanical ventilation. The area under the curve (AUC) for the validation set ROC curve was 0.856, 95% confidence interval (0.805-0.907), indicating good discrimination. The objectives include constructing a predictive model for risk assessment and validating its predictive efficacy.",
        journal: "Frontiers in cardiovascular medicine",
        year: "2024",
        authors: ["Yu X"],
      },
    ], { originalQuery: "大動脈解離の気管切開リスク", outcomeTags: ["tracheostomy", "prolonged-ventilation"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("長期人工呼吸/気管切開リスク予測モデル");
    expect(cards[0].clinicianSummary).toContain("AUC 0.856");
    expect(cards[0].clinicianSummary).toMatch(/呼吸不全|腎障害|肺合併症/);
    expect([cards[0].clinicianSummary, ...(cards[0].keyFindings ?? [])].join(" ")).not.toMatch(/This study aims|The objectives include|要点:/i);
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
      originalQuery: "大動脈解離の腎不全リスクについて言及している論文",
      outcomeTags: ["renal-failure"],
    });

    expect(cards[0].clinicianSummary).toContain("術後急性腎不全/AKI");
    expect(cards[0].clinicianSummary).not.toContain("<b>");
    expect(cards[0].clinicianSummary).not.toContain("Background: Acute kidney injury");
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
    ], { originalQuery: "大動脈解離の腎不全リスクについて", outcomeTags: ["renal-failure"] });

    const card = cards[0];
    expect(card.clinicianSummary).toBeDefined();
    expect(card.clinicianSummary?.length).toBeLessThanOrEqual(140);
    expect(card.clinicianSummary).toContain("術後AKI");
    expect(card.clinicianSummary).toContain("50.7%");
    expect(card.clinicianSummary).not.toContain("The synthesized incidence");
    expect(card.keyFindings?.length).toBeLessThanOrEqual(3);
    expect(card.keyFindings?.every((finding) => finding.length <= 180)).toBe(true);
  });

  it("summarizes answer-bearing AKI incidence papers instead of echoing the title as a dialysis summary", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "42375845",
        title: "Incidence and risk factors of acute kidney injury following Stanford type A aortic dissection surgery: a systematic review and meta-analysis.",
        abstractText:
          "The meta-analysis showed that the overall incidence of postoperative AKI following TAAD was 50.72%. Regarding risk factors, age (per 1-year: OR = 1.03) was associated with postoperative AKI. This study aims to synthesize the existing evidence to identify the incidence of AKI following surgery for TAAD and its primary risk factors.",
        journal: "Frontiers in cardiovascular medicine",
        year: "2026",
        authors: ["Yang H"],
      },
    ], { originalQuery: "大動脈解離の腎不全リスクについて", outcomeTags: ["renal-failure"] });

    const card = cards[0];
    expect(card.evidenceId).toBe("PUBMED-42375845");
    expect(card.clinicianSummary).toContain("術後AKI");
    expect(card.clinicianSummary).toContain("50.72%");
    expect(card.clinicianSummary).toContain("高齢");
    expect(card.clinicianSummary).not.toContain("Incidence and risk factors of acute kidney injury");
    expect(card.clinicianSummary).not.toMatch(/^透析:/);
    expect(card.clinicianSummary?.length).toBeLessThanOrEqual(140);
    expect(card.keyFindings?.[0]).toContain("overall incidence of postoperative AKI following TAAD was 50.72%");
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
    ], { originalQuery: "大動脈解離の腎不全リスクについて言及している論文をできるだけ詳しく探して、医師が説明に使えるものだけを表示してほしい", outcomeTags: ["renal-failure"] });

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

  it("does not surface type B or method-only renal papers for the default acute type A consent context", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "33784934",
        title: "Outcomes and risk management in type B aortic dissection patients with acute kidney injury: a concise review.",
        abstractText: "A literature search was performed using PubMed, Embase, MEDLINE. AKI in type B aortic dissection is a well-recognized complication and indicates poor short-term and long-term outcome.",
        journal: "Renal failure",
        year: "2021",
        authors: ["Chen J"],
      },
      {
        pmid: "37212922",
        title: "Postoperative nomogram and risk calculator of acute renal failure for Stanford type A aortic dissection surgery.",
        abstractText: "This study aimed to explore the risk factors of acute renal failure after Stanford type A aortic dissection surgery. The nomogram model could predict the risk of ARF with a sensitivity of 81.3% and a specificity of 78.6%. External data validation was performed with a sensitivity of 79.2% and a specificity of 79.8%.",
        journal: "General thoracic and cardiovascular surgery",
        year: "2023",
        authors: ["Zhang J"],
      },
      {
        pmid: "strong",
        title: "Dialysis-requiring acute kidney injury after surgery for acute type A aortic dissection.",
        abstractText: "Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair.",
        journal: "Aorta",
        year: "2024",
        authors: [],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-strong"]);
    expect(cards.map((card) => card.evidenceId)).not.toContain("PUBMED-33784934");
    expect(cards.map((card) => card.evidenceId)).not.toContain("PUBMED-37212922");
    expect(cards[0].clinicianSummary).toContain("8.2%");
    expect(cards[0].keyFindings?.join(" ")).not.toMatch(/literature search was performed|This study aimed/i);
  });

  it("requires a direct dialysis or renal-replacement span when the query asks for dialysis", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "35578281",
        title: "Acute renal failure after acute type A aortic dissection repair. Insidious postoperative complication with poor short- and long-term prognosis.",
        abstractText: "Many systems and organs are affected by malperfusion which presents preoperatively and postoperatively. Postoperative acute renal failure after ATAAD constitutes a severe and insidious complication. Renal replacement therapy represents an additional risk factor for short-, mid-, and long-term outcomes after ATAAD.",
        journal: "Journal of cardiac surgery",
        year: "2022",
        authors: ["Samanidis G"],
      },
      {
        pmid: "35687063",
        title: "Sex differences in acute type A aortic dissection: a systematic review and meta-analysis.",
        abstractText: "There was no difference between sexes in rates of postoperative stroke, atrial fibrillation, reoperation, acute kidney injury, renal failure, and respiratory failure.",
        journal: "Aorta",
        year: "2022",
        authors: [],
      },
      {
        pmid: "40569847",
        title: "Outcome after day- and nighttime surgery for acute type A aortic dissection.",
        abstractText: "No significant differences were found in the rates of myocardial infarction, renal failure or neurological outcome other than global brain ischaemia. Significantly higher 1-year mortality was demonstrated in the daytime group.",
        journal: "European journal of cardio-thoracic surgery",
        year: "2025",
        authors: [],
      },
      {
        pmid: "36013300",
        title: "Postoperative Intensive Care Management of Aortic Repair.",
        abstractText: "Vascular surgery patients have multiple comorbidities and are at high risk for perioperative complications. Aortic repair includes aneurysm and occasional dissection cases. EVAR has lower rates of postoperative renal failure compared to open repair, with approximately one-third of the risk of hemodialysis.",
        journal: "Anesthesiology clinics",
        year: "2022",
        authors: [],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-35578281"]);
    expect(cards[0].keyFindings?.[0]).toContain("Renal replacement therapy");
    expect(cards[0].clinicianSummary).toContain("腎代替療法");
    expect(cards[0].clinicianSummary).not.toMatch(/^透析:/);
  });

  it("synthesizes Japanese clinician summaries for renal PubMed cards instead of pasting truncated abstract fragments", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "35578281",
        title: "Acute renal failure after acute type A aortic dissection repair. Insidious postoperative complication with poor short- and long-term prognosis.",
        abstractText: "Many systems and organs are affected by malperfusion which presents preoperatively and postoperatively. Postoperative acute renal failure after ATAAD constitutes a severe and insidious complication. Acute renal damage is observed in many patients with ATAAD preoperatively and it burdens the renal function postoperatively. Renal replacement therapy represents an additional risk factor for short-, mid-, and long-term outcomes after ATAAD.",
        journal: "Journal of cardiac surgery",
        year: "2022",
        authors: ["Samanidis G"],
      },
      {
        pmid: "37212922",
        title: "Postoperative nomogram and risk calculator of acute renal failure for Stanford type A aortic dissection surgery.",
        abstractText: "This study aimed to explore the risk factors of acute renal failure after Stanford type A aortic dissection surgery. The nomogram model could predict the risk of ARF with a sensitivity of 81.3% and a specificity of 78.6%. External data validation was performed with a sensitivity of 79.2% and a specificity of 79.8%. All enrolled patients were divided into the ARF group and non-ARF group.",
        journal: "General thoracic and cardiovascular surgery",
        year: "2023",
        authors: ["Zhang J"],
      },
    ], { originalQuery: "大動脈解離の腎不全リスクについて言及している論文", outcomeTags: ["renal-failure"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-37212922", "PUBMED-35578281"]);
    expect(cards[0].clinicianSummary).toContain("術後ARF予測モデル");
    expect(cards[0].clinicianSummary).toContain("感度81.3%");
    expect(cards[0].clinicianSummary).toContain("特異度78.6%");
    expect(cards[1].clinicianSummary).toContain("術後急性腎不全");
    expect(cards[1].clinicianSummary).toContain("腎代替療法");
    expect(cards[1].clinicianSummary).toContain("予後不良");
    for (const card of cards) {
      const summary = card.clinicianSummary ?? "";
      expect(summary).not.toMatch(/Renal replacement therapy represents|This study aimed|All enrolled patients|\.\.\.|…/i);
      expect(summary.length).toBeLessThanOrEqual(170);
    }
  });

  it("keeps concrete numeric findings in renal PubMed summaries even when a direct dialysis sentence is also present", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "renal-model-plus-dialysis",
        title: "Postoperative nomogram and risk calculator of acute renal failure for Stanford type A aortic dissection surgery.",
        abstractText: "Renal replacement therapy represents an additional risk factor for short-, mid-, and long-term outcomes after ATAAD repair. The nomogram model could predict the risk of ARF with a sensitivity of 81.3% and a specificity of 78.6%. External data validation was performed with a sensitivity of 79.2% and a specificity of 79.8%.",
        journal: "General thoracic and cardiovascular surgery",
        year: "2023",
        authors: ["Zhang J"],
      },
      {
        pmid: "renal-outcome-plus-frequency",
        title: "Renal replacement therapy and outcomes after acute type A aortic dissection repair.",
        abstractText: "Renal replacement therapy represents an additional risk factor for short-, mid-, and long-term outcomes after ATAAD repair. Postoperative renal complications occurred in 17.6% versus 15.7% of patients in the comparison groups.",
        journal: "Aorta",
        year: "2025",
        authors: ["Ito K"],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards).toHaveLength(2);
    expect(cards[0].keyFindings?.join(" ")).toContain("81.3%");
    expect(cards[0].keyFindings?.join(" ")).toContain("78.6%");
    expect(cards[0].clinicianSummary).toContain("感度81.3%");
    expect(cards[0].clinicianSummary).toContain("特異度78.6%");
    expect(cards[0].clinicianSummary).not.toMatch(/主要所見を医師が確認|PubMed候補/);
    expect(cards[1].keyFindings?.join(" ")).toContain("17.6%");
    expect(cards[1].clinicianSummary).toContain("17.6%");
  });

  it("does not graft renal replacement wording onto ECMO systematic-review papers", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "ecmo-review",
        title: "Extracorporeal Membrane Oxygenation Following Acute Type A Aortic Dissection Repair: A Systematic Review and Meta-Analysis.",
        abstractText: "This systematic review evaluated extracorporeal membrane oxygenation following acute type A aortic dissection repair. Acute kidney injury requiring continuous renal replacement therapy rate was 58.3% among ECMO-supported patients. Mortality was high. The review focused on ECMO rescue after postoperative cardiopulmonary failure.",
        journal: "Journal of cardiac surgery",
        year: "2025",
        authors: ["Sato K"],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("ECMO");
    expect(cards[0].clinicianSummary).toContain("CRRT");
    expect(cards[0].clinicianSummary).toContain("58.3%");
    expect(cards[0].clinicianSummary).not.toMatch(/A型大動脈解離術後急性腎不全に関する研究|術前からの腎障害|腎代替療法は予後不良の追加リスク/);
  });

  it("builds structured Japanese physician summaries for generic answer-bearing PubMed outcome papers", () => {
    const plan = buildPubMedNaturalLanguageSearch("大動脈解離の死亡率について言及している論文");
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "mortality-review",
        title: "Mortality in acute type A aortic dissection - A systematic review based on contemporary registries.",
        abstractText: "We included registry-based studies reporting in-hospital, 30-day, operative or 48-hour mortality following ATAAD. In-hospital mortality ranged from 5% to 29%. Thirty-day mortality ranged from 9% to 31%.",
        journal: "Romanian journal of internal medicine",
        year: "2025",
        authors: ["Matei R"],
      },
    ], { originalQuery: plan.originalQuery, outcomeTags: plan.outcomeTags });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("システマティックレビュー");
    expect(cards[0].clinicianSummary).toContain("院内死亡5–29%");
    expect(cards[0].clinicianSummary).toContain("30日死亡9–31%");
    expect(cards[0].clinicianSummary).toContain("医師確認");
    expect(cards[0].clinicianSummary).not.toMatch(/^死亡率に関するPubMed候補|We included registry|要点:/i);
    expect(cards[0].clinicianSummary?.length).toBeLessThanOrEqual(170);
  });

  it("extracts design, frequency, and risk-factor gist without hardcoding a specific outcome", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "stroke-risk",
        title: "Postoperative stroke in acute type A aortic dissection repair: incidence, predictors, and outcomes.",
        abstractText: "A retrospective cohort study included 512 patients undergoing acute type A aortic dissection repair. Postoperative stroke occurred in 13.6% of patients. Independent predictors included preoperative malperfusion, prolonged cardiopulmonary bypass time, and arch replacement. Stroke was associated with increased operative mortality.",
        journal: "Aorta",
        year: "2025",
        authors: ["Kobayashi T"],
      },
    ], { originalQuery: "大動脈解離術後の脳卒中リスクについて言及している論文", outcomeTags: ["stroke", "neurologic-dysfunction"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("後ろ向きコホート");
    expect(cards[0].clinicianSummary).toContain("術後脳卒中13.6%");
    expect(cards[0].clinicianSummary).toMatch(/malperfusion|CPB|弓部置換/);
    expect(cards[0].clinicianSummary).toContain("死亡");
    expect(cards[0].clinicianSummary).not.toMatch(/^要点:|A retrospective cohort study|Independent predictors included/i);
    expect(cards[0].clinicianSummary?.length).toBeLessThanOrEqual(170);
  });

  it("summarizes qualitative mechanism/review papers without falling back to vague PubMed-candidate text", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "stroke-review",
        title: "Cerebral Protection Strategies and Stroke in Surgery for Acute Type A Aortic Dissection.",
        abstractText: "Perioperative stroke remains a devastating complication in the operative treatment of acute type A aortic dissection. To reduce the risk of perioperative stroke, different perfusion techniques can be applied. Arterial cannulation sites with antegrade perfusion in combination with moderate hypothermia seem to be advantageous.",
        journal: "Aorta",
        year: "2023",
        authors: ["Tanaka H"],
      },
    ], { originalQuery: "大動脈解離術後の脳卒中リスクについて言及している論文", outcomeTags: ["stroke", "neurologic-dysfunction"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("脳保護/灌流戦略");
    expect(cards[0].clinicianSummary).toMatch(/カニュレーション|順行性灌流|低体温/);
    expect(cards[0].clinicianSummary).not.toMatch(/主要所見を医師が確認|PubMed候補|Perioperative stroke remains/i);
    expect(cards[0].clinicianSummary?.length).toBeLessThanOrEqual(170);
  });

  it("does not treat reoperation-procedure papers or generic complication lists as bleeding-risk evidence", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "38495943",
        title: "Clinical study of reoperation for acute type A aortic dissection.",
        abstractText: "In the EVAR group, 47 patients (95.92%) were successfully implanted with overlapping stents, and 2 patients died in the perioperative period. Postoperative complications included cerebral infarction (4.08%), acute renal insufficiency (30.61%), pulmonary insufficiency and need for ventilator (6.12%), poor wound healing. In the TAAR group, 12 patients (92.31%) were successfully revascularized and 1 patient died in the perioperative period.",
        journal: "Frontiers in cardiovascular medicine",
        year: "2024",
        authors: ["Feng X"],
      },
      {
        pmid: "direct-bleeding",
        title: "Re-exploration for bleeding after acute type A aortic dissection repair: incidence and outcomes.",
        abstractText: "Re-exploration for bleeding occurred in 9.4% of patients after acute type A aortic dissection repair. Bleeding-related reoperation was associated with higher transfusion and operative mortality.",
        journal: "Aorta",
        year: "2025",
        authors: ["Ito K"],
      },
    ], { originalQuery: "大動脈解離の出血リスクについて言及している論文", outcomeTags: ["bleeding", "reoperation"] });

    expect(cards.map((card) => card.evidenceId)).toEqual(["PUBMED-direct-bleeding"]);
    expect(cards[0].clinicianSummary).toContain("出血");
    expect(cards[0].clinicianSummary).toContain("9.4%");
    expect(cards[0].clinicianSummary).not.toMatch(/Postoperative complications included|cerebral infarction|acute renal insufficiency|pulmonary insu/i);
  });

  it("summarizes renal-replacement findings in ECMO/systematic-review papers as subgroup-limited, not a generic dialysis-risk answer", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "ecmo-crrt",
        title: "Extracorporeal Membrane Oxygenation Following Acute Type A Aortic Dissection Repair: A Systematic Review and Meta-Analysis.",
        abstractText: "Acute kidney injury requiring continuous renal replacement therapy rate was 58.3% among ECMO-supported patients. Mortality was high after extracorporeal membrane oxygenation following acute type A aortic dissection repair.",
        journal: "J Card Surg",
        year: "2025",
        authors: ["Kato T"],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards).toHaveLength(1);
    expect(cards[0].clinicianSummary).toContain("ECMO");
    expect(cards[0].clinicianSummary).toContain("CRRT");
    expect(cards[0].clinicianSummary).toContain("58.3%");
    expect(cards[0].clinicianSummary).not.toContain("A型大動脈解離術後急性腎不全に関する研究");
    expect(cards[0].clinicianSummary).not.toContain("予後不良の追加リスク");
  });

  it("keeps off-domain and outcome-mismatch PubMed cards visible only as reference/exclude tiers, never as adoption candidates", () => {
    const cards = convertPubMedArticlesToEvidenceCards([
      {
        pmid: "off-domain-aneurysm",
        title: "Dialysis after elective abdominal aortic aneurysm repair.",
        abstractText: "Dialysis was required in 8.2% after elective abdominal aneurysm surgery. The study does not include aortic dissection.",
        journal: "Vascular surgery",
        year: "2022",
        authors: [],
      },
      {
        pmid: "outcome-mismatch-aki",
        title: "Acute kidney injury after acute type A aortic dissection repair: incidence and risk factors.",
        abstractText: "Postoperative acute kidney injury occurred in 50.7% after acute type A aortic dissection repair. Dialysis or renal replacement therapy was not reported.",
        journal: "Renal failure",
        year: "2023",
        authors: [],
      },
      {
        pmid: "composite-dialysis-endpoint",
        title: "A tailored strategy for repair of acute type A aortic dissection.",
        abstractText: "A composite of major adverse events (operative mortality, myocardial infarction, stroke, dialysis, or tracheostomy) was higher in the conservative group (15.1% vs 5.9%; P = .03).",
        journal: "The Journal of thoracic and cardiovascular surgery",
        year: "2022",
        authors: [],
      },
      {
        pmid: "adopt-dialysis",
        title: "Dialysis-requiring acute kidney injury after surgery for acute type A aortic dissection.",
        abstractText: "Postoperative dialysis was required in 8.2% of patients after acute type A aortic dissection repair. Dialysis-requiring renal failure was associated with increased mortality.",
        journal: "Aorta",
        year: "2024",
        authors: [],
      },
    ], { originalQuery: "大動脈解離の透析リスクについて言及している論文", outcomeTags: ["renal-failure", "dialysis"] });

    expect(cards.map((card) => [card.evidenceId, card.physicianReviewTierLabel])).toEqual([
      ["PUBMED-adopt-dialysis", "採用候補"],
      ["PUBMED-outcome-mismatch-aki", "参考止まり"],
    ]);
    expect(cards.map((card) => card.evidenceId)).not.toContain("PUBMED-off-domain-aneurysm");
    expect(cards.some((card) => card.physicianReviewTierLabel === "除外推奨")).toBe(false);
    expect(cards[0].outcomeTags).toContain("dialysis");
    expect(cards[1].outcomeTags).not.toContain("dialysis");
    expect(cards[1].physicianReviewReason).toContain("透析/腎代替療法の直接記載が弱い");
  });
});
