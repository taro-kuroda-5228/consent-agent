import type { EvidenceCard } from "./consent-demo";

export type ClinicalQuery = {
  rawQuery: string;
  language: "ja" | "en";
  conditionConcepts: string[];
  interventionOrContextConcepts: string[];
  outcomeConcepts: string[];
  timingConcepts: string[];
  questionType: "risk" | "benefit" | "diagnosis" | "prognosis" | "treatment" | "complication" | "general";
  relevanceStrategy: "topic-level-clinical-relevance";
  futureModelPlan: string;
};

export type PubMedSearchPlan = {
  originalQuery: string;
  clinicalQuery: ClinicalQuery;
  pubmedTerm: string;
  explainForDoctor: string;
  outcomeTags: string[];
  rankingPolicy: string;
  evaluationPolicy: string;
};

export type PubMedArticle = {
  pmid: string;
  title: string;
  abstractText: string;
  journal: string;
  year: string;
  authors: string[];
};

type OutcomeTopic = {
  tags: string[];
  concepts: string[];
  explainJa: string;
  queryPattern: RegExp;
  pubmedTerms: string[];
  answerPattern: RegExp;
  titleFocusPattern: RegExp;
};

const OUTCOME_TOPICS: OutcomeTopic[] = [
  {
    tags: ["renal-failure", "dialysis"],
    concepts: ["acute kidney injury", "renal failure", "dialysis"],
    explainJa: "透析・腎不全リスク",
    queryPattern: /透析|腎不全|腎障害|aki|renal|kidney|dialysis/i,
    pubmedTerms: ["dialysis", "renal failure", "acute kidney injury", "kidney injury"],
    answerPattern: /dialysis|renal replacement|acute kidney injury|renal failure|kidney injury|postoperative renal/i,
    titleFocusPattern: /dialysis|renal replacement|acute kidney injury|renal failure|kidney/i,
  },
  {
    tags: ["mesenteric-ischemia", "visceral-malperfusion"],
    concepts: ["mesenteric ischemia", "visceral malperfusion"],
    explainJa: "腸管虚血/腸間膜malperfusion",
    queryPattern: /腸管虚血|腸管壊死|腸間膜虚血|腸間膜|腹部臓器虚血|臓器灌流障害|mesenteric|bowel ischemia|intestinal ischemia|visceral|malperfusion/i,
    pubmedTerms: ["mesenteric ischemia", "bowel ischemia", "intestinal ischemia", "mesenteric malperfusion", "visceral malperfusion", "visceral ischemia"],
    answerPattern: /mesenteric ischemia|bowel ischemia|intestinal ischemia|mesenteric malperfusion|visceral malperfusion|visceral ischemia/i,
    titleFocusPattern: /mesenteric|visceral|bowel|intestinal|malperfusion/i,
  },
  {
    tags: ["ards", "respiratory-complication"],
    concepts: ["acute respiratory distress syndrome", "respiratory failure", "pulmonary complication", "acute lung injury", "oxygenation impairment"],
    explainJa: "ARDS/呼吸不全・肺合併症",
    queryPattern: /ards|acute respiratory distress|急性呼吸窮迫|呼吸窮迫|呼吸不全|肺障害|肺合併症|oxygenation|oxygenation impairment|respiratory failure|pulmonary complication|lung injury/i,
    pubmedTerms: ["ARDS", "acute respiratory distress syndrome", "respiratory failure", "pulmonary complication", "postoperative pulmonary complication", "acute lung injury", "oxygenation impairment"],
    answerPattern: /\bards\b|acute respiratory distress syndrome|respiratory failure|pulmonary complication|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/i,
    titleFocusPattern: /\bards\b|acute respiratory distress|respiratory|pulmonary|lung injury|oxygenation/i,
  },
  {
    tags: ["tracheostomy", "prolonged-ventilation"],
    concepts: ["tracheostomy", "prolonged mechanical ventilation"],
    explainJa: "気管切開・長期人工呼吸",
    queryPattern: /気管切開|tracheostom|tracheotom|prolonged ventilation|prolonged mechanical ventilation/i,
    pubmedTerms: ["tracheostomy", "tracheotomy", "prolonged mechanical ventilation", "prolonged ventilation"],
    answerPattern: /tracheostomy|tracheotomy|prolonged mechanical ventilation|prolonged ventilation/i,
    titleFocusPattern: /tracheostomy|tracheotomy|prolonged (?:mechanical )?ventilation/i,
  },
  {
    tags: ["stroke", "neurologic-dysfunction"],
    concepts: ["stroke", "neurologic dysfunction"],
    explainJa: "脳卒中/神経合併症",
    queryPattern: /脳梗塞|脳卒中|stroke|neurologic|neurological/i,
    pubmedTerms: ["stroke", "neurologic", "neurological", "cerebral"],
    answerPattern: /stroke|neurologic|neurological|cerebral/i,
    titleFocusPattern: /stroke|neurologic|neurological|cerebral/i,
  },
  {
    tags: ["mortality"],
    concepts: ["mortality", "survival"],
    explainJa: "死亡率/生存率",
    queryPattern: /死亡|mortality|death|survival/i,
    pubmedTerms: ["mortality", "death", "survival"],
    answerPattern: /mortality|death|survival/i,
    titleFocusPattern: /mortality|death|survival/i,
  },
  {
    tags: ["bleeding", "reoperation"],
    concepts: ["bleeding", "reoperation", "re-exploration"],
    explainJa: "出血/再開胸・再手術",
    queryPattern: /出血|bleeding|hemorrhage|再開胸|再手術|reoperation|re-exploration/i,
    pubmedTerms: ["bleeding", "hemorrhage", "reoperation", "re-exploration", "surgical re-exploration"],
    answerPattern: /bleeding|hemorrhage|reoperation|re-exploration|surgical re-exploration/i,
    titleFocusPattern: /bleeding|hemorrhage|reoperation|re-exploration/i,
  },
  {
    tags: ["spinal-cord-ischemia"],
    concepts: ["spinal cord ischemia", "paraplegia"],
    explainJa: "脊髄虚血/対麻痺",
    queryPattern: /脊髄虚血|対麻痺|spinal cord ischemia|spinal isch?emia|paraplegia/i,
    pubmedTerms: ["spinal cord ischemia", "spinal cord ischaemia", "paraplegia", "spinal cord injury"],
    answerPattern: /spinal cord ischemia|spinal cord ischaemia|paraplegia|spinal cord injury/i,
    titleFocusPattern: /spinal cord ischemia|spinal cord ischaemia|paraplegia|spinal cord injury/i,
  },
  {
    tags: ["icu-stay"],
    concepts: ["intensive care unit stay", "ICU length of stay"],
    explainJa: "ICU滞在期間",
    queryPattern: /icu|集中治療|集中治療室|滞在期間|length of stay|intensive care/i,
    pubmedTerms: ["intensive care unit", "ICU", "ICU length of stay", "length of stay"],
    answerPattern: /intensive care unit|\bICU\b|length of stay|hospital stay/i,
    titleFocusPattern: /intensive care|\bICU\b|length of stay/i,
  },
  {
    tags: ["infection"],
    concepts: ["infection", "pneumonia", "sepsis"],
    explainJa: "感染/肺炎・敗血症",
    queryPattern: /感染|肺炎|敗血症|infection|pneumonia|sepsis/i,
    pubmedTerms: ["infection", "pneumonia", "sepsis", "surgical site infection"],
    answerPattern: /infection|pneumonia|sepsis|surgical site infection/i,
    titleFocusPattern: /infection|pneumonia|sepsis/i,
  },
];

function matchOutcomeTopics(query: string): OutcomeTopic[] {
  return OUTCOME_TOPICS.filter((topic) => topic.queryPattern.test(query));
}

function outcomeTopicsForTags(tags: string[]): OutcomeTopic[] {
  return OUTCOME_TOPICS.filter((topic) => topic.tags.some((tag) => tags.includes(tag)));
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text: string, pattern: RegExp): string {
  return decodeXml(text.match(pattern)?.[1] ?? "");
}

function allMatches(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern)).map((match) => decodeXml(match[1])).filter(Boolean);
}

export function parseClinicalQuery(query: string): ClinicalQuery {
  const normalized = query.toLowerCase();
  const isJapanese = /[ぁ-んァ-ン一-龠]/.test(query);
  const conditionConcepts: string[] = [];
  const interventionOrContextConcepts: string[] = [];
  const outcomeConcepts: string[] = [];
  const timingConcepts: string[] = [];

  if (/大動脈解離|aortic dissection|dissection/.test(normalized)) {
    conditionConcepts.push("acute aortic dissection", "type A aortic dissection");
  }
  if (/手術|術後|周術期|surgery|surgical|postoperative|perioperative/.test(normalized)) {
    interventionOrContextConcepts.push("surgery");
  }
  if (/術後|postoperative/.test(normalized)) timingConcepts.push("postoperative");
  if (/周術期|手術|術後|perioperative|surgery|surgical/.test(normalized)) timingConcepts.push("perioperative");
  for (const topic of matchOutcomeTopics(query)) {
    outcomeConcepts.push(...topic.concepts);
  }

  const questionType: ClinicalQuery["questionType"] = /リスク|risk|predictor|予測|合併症|complication/.test(normalized)
    ? "risk"
    : /治療|treatment|therapy/.test(normalized)
      ? "treatment"
      : /診断|diagnosis/.test(normalized)
        ? "diagnosis"
        : /予後|prognosis|outcome/.test(normalized)
          ? "prognosis"
          : "general";

  return {
    rawQuery: query,
    language: isJapanese ? "ja" : "en",
    conditionConcepts: Array.from(new Set(conditionConcepts)),
    interventionOrContextConcepts: Array.from(new Set(interventionOrContextConcepts)),
    outcomeConcepts: Array.from(new Set(outcomeConcepts)),
    timingConcepts: Array.from(new Set(timingConcepts)),
    questionType,
    relevanceStrategy: "topic-level-clinical-relevance",
    futureModelPlan: "supervised reranker after clinician feedback and query/article relevance labels are collected post-application launch",
  };
}

export function buildPubMedNaturalLanguageSearch(query: string): PubMedSearchPlan {
  const normalized = query.toLowerCase();
  const clinicalQuery = parseClinicalQuery(query);
  const conceptTerms: string[] = [];
  const tags: string[] = [];
  const explanations: string[] = [];

  if (/大動脈解離|aortic dissection|dissection/.test(normalized)) {
    conceptTerms.push('(aortic dissection[Title/Abstract] OR acute type A aortic dissection[Title/Abstract] OR ATAAD[Title/Abstract])');
    explanations.push("大動脈解離/ATAAD");
  }
  for (const topic of matchOutcomeTopics(query)) {
    const term = `(${topic.pubmedTerms.map((pubmedTerm) => `${pubmedTerm}[Title/Abstract]`).join(" OR ")})`;
    conceptTerms.push(term);
    tags.push(...topic.tags);
    explanations.push(topic.explainJa);
  }

  const safeFallback = query
    .replace(/["'()]/g, " ")
    .split(/[\s、。・？?]+/)
    .filter((part) => part.length >= 2)
    .slice(0, 6)
    .map((part) => `${part}[Title/Abstract]`);
  const pubmedTerm = conceptTerms.length > 0
    ? `${conceptTerms.join(" AND ")} AND (risk[Title/Abstract] OR outcome[Title/Abstract] OR postoperative[Title/Abstract] OR complication[Title/Abstract]) NOT (retraction[Publication Type] OR retraction[Title])`
    : `${safeFallback.join(" AND ")} NOT (retraction[Publication Type] OR retraction[Title])`;

  return {
    originalQuery: query,
    clinicalQuery,
    pubmedTerm,
    explainForDoctor: explanations.length > 0
      ? `自然文から ${explanations.join("、")} をPubMed検索語へ展開しました。`
      : "自然文をTitle/Abstract検索語へ展開しました。",
    outcomeTags: Array.from(new Set(tags)),
    rankingPolicy: "Broad PubMed retrieval followed by taxonomy-driven answerability ranking: prefer articles that directly answers the structured clinical question, downrank/omit secondary-only mentions and broad outcome lists.",
    evaluationPolicy: "Observed false positives are kept as regression fixture examples for clinical relevance evaluation, not as product-wide PMID exclusion rules.",
  };
}

export function parsePubMedEFetchXml(xml: string): PubMedArticle[] {
  const articleBlocks = Array.from(xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)).map((match) => match[1]);
  return articleBlocks.map((block) => {
    const pmid = firstMatch(block, /<PMID[^>]*>([\s\S]*?)<\/PMID>/);
    const title = firstMatch(block, /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const abstractParts = allMatches(block, /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    const journal = firstMatch(block, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>[\s\S]*?<\/Journal>/) || firstMatch(block, /<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/);
    const year = firstMatch(block, /<PubDate>[\s\S]*?<Year>([\s\S]*?)<\/Year>[\s\S]*?<\/PubDate>/);
    const authors = Array.from(block.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g))
      .map((match) => {
        const lastName = firstMatch(match[1], /<LastName>([\s\S]*?)<\/LastName>/);
        const initials = firstMatch(match[1], /<Initials>([\s\S]*?)<\/Initials>/);
        return [lastName, initials].filter(Boolean).join(" ");
      })
      .filter(Boolean);
    return { pmid, title, abstractText: abstractParts.join(" "), journal, year, authors };
  }).filter((article) => article.pmid && article.title);
}

function extractKeyFindings(abstractText: string): string[] {
  const normalized = abstractText
    .replace(/\s*(Background|Methods|Results|Conclusions):\s*/gi, ". $1: ")
    .replace(/^\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = normalized
    .split(/(?<=[.!?。])\s+|(?=\b(?:Background|Methods|Results|Conclusions):)/i)
    .map((sentence) => sentence.trim().replace(/^\.\s*/, ""))
    .filter((sentence, index, all) => sentence.length >= 20 && all.indexOf(sentence) === index);
  const methodOnly = (sentence: string) => /\b(?:a literature search was performed|this study aimed|aimed to explore|we aimed to|the aim of this study|methods?:|background:)\b/i.test(sentence);
  const candidateSentences = sentences.filter((sentence) => !methodOnly(sentence));
  const numericOutcome = candidateSentences.filter((sentence) => /\d+(?:\.\d+)?\s*%|95\s*%\s*(?:confidence interval|CI)|odds ratio|risk ratio|\bOR\b|\bRR\b|sensitivity|specificity/i.test(sentence));
  const directOutcome = candidateSentences.filter((sentence) => /dialysis|renal replacement|acute kidney injury|\bAKI\b|acute renal failure|\bARF\b|renal|kidney|mortality|stroke|bleeding|reoperation|re-exploration|risk|outcome|mesenteric|bowel|intestinal|visceral|ischemia|malperfusion|revascularization|necrotic|\bARDS\b|acute respiratory distress|respiratory failure|pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation|tracheostomy|tracheotomy|spinal cord|paraplegia|intensive care|\bICU\b|length of stay|infection|pneumonia|sepsis/i.test(sentence));
  const fallbackSentences = candidateSentences.length > 0 ? [] : sentences;
  return Array.from(new Set([...(numericOutcome.length ? numericOutcome : []), ...directOutcome, ...candidateSentences, ...fallbackSentences]))
    .map(compactFindingForMobile)
    .filter(Boolean)
    .slice(0, 3);
}

function compactFindingForMobile(sentence: string): string {
  const normalized = sentence
    .replace(/\s*\[[^\]]{30,}\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.\./g, ".")
    .trim();
  if (/^Risk factors for AKI included/i.test(normalized)) {
    const riskLabels: string[] = [];
    if (/cardiopulmonary bypass|\bCPB\b/i.test(normalized)) riskLabels.push("CPB >180分");
    if (/operative time/i.test(normalized)) riskLabels.push("手術時間 >7時間");
    if (/advanced age/i.test(normalized)) riskLabels.push("高齢");
    if (/transfusion|pRBC/i.test(normalized)) riskLabels.push("輸血");
    if (/body mass index|BMI/i.test(normalized)) riskLabels.push("BMI高値");
    if (/preoperative kidney injury/i.test(normalized)) riskLabels.push("術前腎障害");
    if (riskLabels.length) return `AKIリスク因子: ${riskLabels.join("・")}。`;
  }
  if (normalized.length <= 180) return normalized;
  const firstClause = normalized.split(/;|\.\s+|, and | and (?=preoperative|advanced|increased|elevated|prolonged)/i)[0]?.trim();
  if (firstClause && firstClause.length >= 30 && firstClause.length <= 180) return firstClause.endsWith(".") ? firstClause : `${firstClause}.`;
  return `${normalized.slice(0, 176).trim()}…`;
}

function prioritizeKeyFindingsForQuery(keyFindings: string[], article: PubMedArticle, context: { originalQuery: string; outcomeTags: string[] }): string[] {
  const asksDialysis = /透析|dialysis/i.test(context.originalQuery) || context.outcomeTags.includes("dialysis");
  if (!asksDialysis) return keyFindings;

  const dialysisSentences = splitClinicalSentences(article.abstractText)
    .filter((sentence) => /dialysis|renal replacement/i.test(sentence))
    .map(compactFindingForMobile)
    .filter(Boolean);
  return Array.from(new Set([...dialysisSentences, ...keyFindings])).slice(0, 3);
}

function splitClinicalSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence, index, all) => sentence.length >= 12 && all.indexOf(sentence) === index);
}

const ANSWER_SIGNAL_PATTERN = /\d+(?:\.\d+)?\s*%|95\s*%\s*(?:confidence interval|CI)|odds ratio|risk ratio|\bOR\b|\bRR\b|incidence|rate|occurred|required|necessary|predictor|risk factors?|associated|increased|decreased|length of stay|duration/i;
const WEAK_LIST_ONLY_PATTERN = /outcome list|collected variables|secondary outcomes?|composite (?:outcome|endpoint)|definition criteria|without[^.]{0,80}(?:incidence|rate|risk factor|predictor|results?)/i;

function findAnswerBearingSentence(text: string, topics: OutcomeTopic[]): string | undefined {
  return splitClinicalSentences(text).find((sentence) => {
    if (WEAK_LIST_ONLY_PATTERN.test(sentence)) return false;
    return topics.some((topic) => topic.answerPattern.test(sentence)) && ANSWER_SIGNAL_PATTERN.test(sentence);
  });
}

function inferJapaneseStudyContext(article: PubMedArticle): string {
  const text = `${article.title} ${article.abstractText}`;
  const typeA = /Stanford type A|acute type A|type A aortic dissection|ATAAD|TAAAD/i.test(text);
  const postoperative = /postoperative|after[^.]{0,80}(?:surgery|repair)|surg(?:ery|ical)/i.test(text);
  const disease = typeA ? "A型大動脈解離" : /aortic dissection/i.test(text) ? "大動脈解離" : "対象疾患";
  const timing = postoperative ? "術後" : "";
  return `${disease}${timing}`;
}

function summarizeGenericOutcome(article: PubMedArticle, keyFindings: string[], context: { outcomeTags: string[] }): string | undefined {
  const topics = outcomeTopicsForTags(context.outcomeTags);
  if (topics.length === 0) return undefined;
  const sourceText = `${article.abstractText} ${keyFindings.join(" ")} ${article.title}.`;
  const sentence = findAnswerBearingSentence(sourceText, topics)
    || keyFindings.find((finding) => topics.some((topic) => topic.answerPattern.test(finding)) && !WEAK_LIST_ONLY_PATTERN.test(finding));
  if (!sentence) return undefined;
  const label = topics[0]?.explainJa.replace(/リスク|・.*$/g, "") || "該当アウトカム";
  const compact = compactFindingForMobile(sentence).replace(/\.$/, "");
  const mostlyEnglish = /^[\x00-\x7F\s.,;:()/%+\-–]+$/.test(compact);
  if (mostlyEnglish) {
    if (topics.some((topic) => topic.tags.includes("renal-failure") || topic.tags.includes("dialysis"))) {
      const hasRenalReplacement = /renal replacement therapy|dialysis/i.test(compact);
      const hasPoorPrognosis = /poor|risk factor|outcomes?|prognosis|mortality|short-|mid-|long-term/i.test(compact);
      if (hasRenalReplacement && hasPoorPrognosis) {
        return `${inferJapaneseStudyContext(article)}急性腎不全に関する研究。腎代替療法は短期・中長期予後不良の追加リスクで、腎機能評価の根拠候補。`;
      }
      if (/acute renal failure|\bARF\b|acute kidney injury|\bAKI\b/i.test(compact)) {
        return `${inferJapaneseStudyContext(article)}急性腎不全/AKIに関するPubMed候補。発症頻度・予測因子・予後への影響をabstractで確認。`;
      }
    }
    const percent = compact.match(/\d+(?:\.\d+)?%/)?.[0];
    if (percent) return `${label}に関するPubMed候補。主要所見に${percent}を含むため、頻度/予測能の確認対象。`;
    return `${label}に関するPubMed候補。主要所見を医師が確認。`;
  }
  return `${label}: ${compact.length <= 120 ? compact : `${compact.slice(0, 116).trim()}…`}。`;
}

function summarizeForDoctor(article: PubMedArticle, keyFindings: string[], context: { originalQuery: string; outcomeTags: string[] }): string {
  const joined = keyFindings.join(" ");
  const sourceText = `${article.title} ${article.abstractText} ${joined}`;
  const asksRenal = context.outcomeTags.some((tag) => tag === "renal-failure" || tag === "dialysis");
  const asksMesenteric = context.outcomeTags.some((tag) => tag === "mesenteric-ischemia" || tag === "visceral-malperfusion");
  const asksArds = context.outcomeTags.some((tag) => tag === "ards" || tag === "respiratory-complication");
  const asksTracheostomy = context.outcomeTags.some((tag) => tag === "tracheostomy" || tag === "prolonged-ventilation");
  const akiPercent = joined.match(/(?:postoperative\s+)?AKI\s+(?:was\s+)?(\d+(?:\.\d+)?%)|incidence of postoperative AKI was (\d+(?:\.\d+)?%)/i);
  const dialysisPercent = joined.match(/dialysis[^.]{0,80}?(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?%)[^.]{0,80}?dialysis/i);
  const mortality = /mortality/i.test(sourceText);
  const riskHints: string[] = [];
  if (/cardiopulmonary bypass|\bCPB\b/i.test(sourceText)) riskHints.push("CPB時間");
  if (/operative time|手術時間/i.test(sourceText)) riskHints.push("手術時間");
  if (/advanced age|elderly|\bage\b|年齢|高齢/i.test(sourceText)) riskHints.push("高齢");
  if (/transfusion|pRBC|輸血/i.test(sourceText)) riskHints.push("輸血");
  if (/body mass index|BMI/i.test(sourceText)) riskHints.push("BMI高値");
  if (/preoperative kidney injury|術前腎障害/i.test(sourceText)) riskHints.push("術前腎障害");

  if (asksMesenteric) {
    const prevalence = sourceText.match(/(?:overall prevalence|prevalence)[^.]{0,40}?(\d+(?:\.\d+)?%)/i)?.[1];
    const inHospitalMortality = sourceText.match(/(?:in-hospital mortality|early mortality rate|mortality rate)[^.]{0,50}?(\d+(?:\.\d+)?%)/i)?.[1];
    if (prevalence && inHospitalMortality && /bowel necrosis|multiorgan failure|multi-organ failure/i.test(sourceText)) {
      return `aTAAD+腸間膜malperfusionは頻度${prevalence}、院内死亡${inHospitalMortality}。腸管壊死/多臓器不全が主な死因。`;
    }
    const incidenceEarlyMortality = sourceText.match(/incidence and early mortality rate[^.]{0,80}?(\d+(?:\.\d+)?%)[^.]{0,40}?(\d+(?:\.\d+)?%)/i);
    if (incidenceEarlyMortality) {
      return `AAAD合併の腸間膜malperfusionは頻度${incidenceEarlyMortality[1]}、早期死亡${incidenceEarlyMortality[2]}。腸管灌流評価と再灌流判断が要点。`;
    }
    const worstMortality = sourceText.match(/mesenteric malperfusion[^.]{0,120}?(\d+\s*(?:-|–|to)\s*\d+%)/i)?.[1]?.replace(/\s+/g, "").replace("to", "–");
    const mpsMortality = sourceText.match(/increased mortality up to (\d+(?:\.\d+)?%)/i)?.[1];
    if (worstMortality || mpsMortality) {
      return `TAADのmalperfusionは死亡リスク上昇${mpsMortality ? `（最大${mpsMortality}）` : ""}。腸間膜malperfusionは特に重篤${worstMortality ? `（死亡${worstMortality}）` : ""}。`;
    }
    const malperfusionRate = sourceText.match(/malperfusion occurred in (\d+(?:\.\d+)?%)/i)?.[1];
    const mesentericOr = sourceText.match(/mesenteric malperfusion[^.]{0,140}?odds ratio,?\s*(\d+(?:\.\d+)?)/i)?.[1];
    if (malperfusionRate && mesentericOr && mortality) {
      return `術前malperfusion ${malperfusionRate}。腸間膜malperfusionは死亡リスク上昇（OR ${mesentericOr}）。`;
    }
    if (/organ-specific malperfusion|epidemiological meta-analysis/i.test(sourceText) && /perioperative mortality rate[^.]{0,80}?(\d+(?:\.\d+)?%)/i.test(sourceText)) {
      const rate = sourceText.match(/perioperative mortality rate[^.]{0,80}?(\d+(?:\.\d+)?%)/i)?.[1];
      return `臓器別malperfusion発生率のメタ解析。malperfusion合併で周術期死亡は最大${rate}まで上昇し、腸間膜/内臓灌流障害評価の根拠候補。`;
    }
    if (/mesenteric malperfusion/i.test(sourceText) && /worst prognosis|postoperative mortality/i.test(sourceText)) {
      return "腸間膜malperfusionは予後不良・術後死亡と関連。中枢修復先行か再灌流先行かを判断する根拠候補。";
    }
    const visceralRate = sourceText.match(/Visceral malperfusion was diagnosed in \d+ patients \((\d+(?:\.\d+)?%)\)/i)?.[1];
    if (visceralRate) {
      return `ATAADでvisceral malperfusion ${visceralRate}。術中/経心膜エコーで灌流障害を診断・管理する報告。`;
    }
    if (/mesenteric ischemia/i.test(sourceText) && /serious|multi-organ failure|necrotic|revascularization/i.test(sourceText)) {
      return "AAD合併の腸間膜虚血は稀だが重篤。早期診断が難しく、壊死前の灌流評価と迅速な再灌流/腸管切除判断が要点。";
    }
    if (/visceral malperfusion|mesenteric malperfusion|mesenteric ischemia/i.test(sourceText)) {
      const compact = compactFindingForMobile(keyFindings.find((finding) => /mesenteric|visceral|malperfusion|ischemia/i.test(finding)) || keyFindings[0] || article.title).replace(/\.$/, "");
      return compact.length <= 130 ? `要点: ${compact}。` : `要点: ${compact.slice(0, 126).trim()}…`;
    }
  }



  if (asksArds) {
    const ardsIncidence = sourceText.match(/(?:incidence of (?:postoperative )?ARDS|ARDS (?:occurred|incidence)|acute respiratory distress syndrome \(ARDS\)[^.]{0,80}?)(?:[^.]{0,80}?)(\d+(?:\.\d+)?%)/i)?.[1]
      || sourceText.match(/(\d+(?:\.\d+)?%)[^.]{0,80}?(?:ARDS|acute respiratory distress syndrome)/i)?.[1];
    const ppcIncidence = sourceText.match(/(?:incidence of PPCs?|incidence of postoperative pulmonary complications?|postoperative pulmonary complications?[^.]{0,80}?)(?:[^.]{0,80}?)(\d+(?:\.\d+)?%)/i)?.[1]
      || sourceText.match(/(\d+(?:\.\d+)?%)[^.]{0,80}?(?:PPCs?|postoperative pulmonary complications?)/i)?.[1];
    const riskLabels: string[] = [];
    if (/inflammatory|C-reactive protein|CRP|neutrophil|interleukin|cytokine/i.test(sourceText)) riskLabels.push("炎症反応");
    if (/oxygenation impairment|oxygenation index|PaO2|FiO2/i.test(sourceText)) riskLabels.push("酸素化障害");
    if (/transfusion|blood transfusion|pRBC/i.test(sourceText)) riskLabels.push("輸血");
    if (/cardiopulmonary bypass|\bCPB\b|circulatory arrest/i.test(sourceText)) riskLabels.push("CPB/循環停止");
    if (/mechanical ventilation|ventilation time/i.test(sourceText)) riskLabels.push("人工呼吸管理");
    if (/predictive model|nomogram|validation/i.test(sourceText)) {
      return `TAAD術後ARDSの予測モデル研究。${ardsIncidence ? `ARDS ${ardsIncidence}。` : ""}${riskLabels.length ? `候補因子: ${riskLabels.slice(0, 4).join("・")}。` : "術前/周術期因子で早期予測。"}`;
    }
    if (/postoperative pulmonary complications?|\bPPCs?\b/i.test(sourceText) && ppcIncidence) {
      return `ATAAD術後肺合併症は${ppcIncidence}。${riskLabels.length ? `リスク因子候補: ${riskLabels.slice(0, 4).join("・")}。` : "ARDS/呼吸不全を含む術後管理の根拠候補。"}`;
    }
    if (/acute lung injury|oxygenation impairment/i.test(sourceText)) {
      return "AADでは術前からALI/酸素化障害を合併し得る。炎症反応を背景に人工呼吸・術後回復へ影響する根拠候補。";
    }
    if (/acute respiratory distress syndrome|\bARDS\b/i.test(sourceText)) {
      return `大動脈解離にARDSを合併すると周術期リスクと術後回復へ影響。${ardsIncidence ? `報告頻度${ardsIncidence}。` : "病態・予測因子確認用。"}`;
    }
    const compact = compactFindingForMobile(keyFindings.find((finding) => /ARDS|respiratory|pulmonary|lung injury|oxygenation/i.test(finding)) || keyFindings[0] || article.title).replace(/\.$/, "");
    return compact.length <= 130 ? `要点: ${compact}。` : `要点: ${compact.slice(0, 126).trim()}…`;
  }
  if (asksTracheostomy) {
    const trachRate = sourceText.match(/tracheostom(?:y|ies)[^.]{0,80}?(?:was|required|necessary|performed|rate|incidence)?[^.]{0,80}?(\d+(?:\.\d+)?%)/i)?.[1]
      || sourceText.match(/(\d+(?:\.\d+)?%)[^.]{0,100}?tracheostom/i)?.[1];
    const ventilationRate = sourceText.match(/prolonged (?:mechanical )?ventilation[^.]{0,80}?(\d+(?:\.\d+)?%)/i)?.[1]
      || sourceText.match(/(\d+(?:\.\d+)?%)[^.]{0,100}?prolonged (?:mechanical )?ventilation/i)?.[1];
    const factors: string[] = [];
    if (/cardiopulmonary bypass|\bCPB\b|circulatory arrest/i.test(sourceText)) factors.push("CPB/循環停止");
    if (/stroke|neurologic|neurological/i.test(sourceText)) factors.push("神経合併症");
    if (/renal|kidney|dialysis|acute kidney injury|\bAKI\b/i.test(sourceText)) factors.push("腎障害");
    if (/pneumonia|pulmonary|respiratory failure|ARDS|acute respiratory distress/i.test(sourceText)) factors.push("肺合併症");
    const rate = trachRate || ventilationRate;
    if (rate) {
      return `ATAAD術後の${trachRate ? "気管切開" : "長期人工呼吸"}は${rate}。${factors.length ? `関連因子候補: ${factors.slice(0, 4).join("・")}。` : "術後呼吸管理リスクの根拠候補。"}`;
    }
    if (/tracheostomy|tracheotomy|prolonged mechanical ventilation|prolonged ventilation/i.test(sourceText)) {
      const compact = compactFindingForMobile(keyFindings.find((finding) => /tracheostomy|tracheotomy|prolonged mechanical ventilation|prolonged ventilation/i.test(finding)) || keyFindings[0] || article.title).replace(/\.$/, "");
      return compact.length <= 130 ? `要点: ${compact}。` : `要点: ${compact.slice(0, 126).trim()}…`;
    }
  }
  const akiIncidencePercent =
    akiPercent?.[1] ||
    akiPercent?.[2] ||
    sourceText.match(/incidence of (?:postoperative\s+)?AKI[^.]{0,120}?(\d+(?:\.\d+)?%)/i)?.[1] ||
    sourceText.match(/(\d+(?:\.\d+)?%)[^.]{0,120}?(?:postoperative\s+)?AKI/i)?.[1];
  const incidence = akiIncidencePercent || dialysisPercent?.[1] || dialysisPercent?.[2];
  if (asksRenal && incidence) {
    const outcome = akiIncidencePercent ? "術後AKI" : "術後透析";
    const tail = [
      `${outcome} ${incidence}`,
      riskHints.length ? `主なリスク: ${riskHints.slice(0, 4).join("・")}` : "",
      mortality ? "AKI例で短期死亡増加" : "",
    ].filter(Boolean).join("。 ");
    return `${tail}。`;
  }
  if (asksRenal && /renal replacement therapy|dialysis/i.test(sourceText) && /short-|mid-|long-term|poor[^.]{0,60}prognosis|outcomes?|mortality/i.test(sourceText)) {
    return `${inferJapaneseStudyContext(article)}急性腎不全に関する研究。腎代替療法は短期・中長期予後不良の追加リスクで、術前からの腎障害が術後腎機能を悪化させ得る。`;
  }
  const arfModel = sourceText.match(/(?:nomogram model|risk calculator|predictive model)[^.]{0,120}?(?:acute renal failure|\bARF\b)[^.]{0,180}?sensitivity of (\d+(?:\.\d+)?%)[^.]{0,80}?specificity of (\d+(?:\.\d+)?%)/i)
    || sourceText.match(/(?:acute renal failure|\bARF\b)[^.]{0,180}?(?:nomogram model|risk calculator|predictive model)[^.]{0,180}?sensitivity of (\d+(?:\.\d+)?%)[^.]{0,80}?specificity of (\d+(?:\.\d+)?%)/i);
  if (asksRenal && arfModel) {
    const validation = sourceText.match(/External data validation[^.]{0,120}?sensitivity of (\d+(?:\.\d+)?%)[^.]{0,80}?specificity of (\d+(?:\.\d+)?%)/i);
    return `${inferJapaneseStudyContext(article)}ARF予測モデル。感度${arfModel[1]}、特異度${arfModel[2]}${validation ? `（外部検証${validation[1]}/${validation[2]}）` : ""}。術後腎不全リスク層別化の根拠候補。`;
  }

  const genericSummary = summarizeGenericOutcome(article, keyFindings, context);
  if (genericSummary) return genericSummary;

  const first = keyFindings[0];
  if (!first) return "PubMed候補。abstractを医師が確認してください。";
  const compact = compactFindingForMobile(first).replace(/\.$/, "");
  return compact.length <= 120 ? `要点: ${compact}。` : `要点: ${compact.slice(0, 116).trim()}…`;
}

function isRetractionLike(article: PubMedArticle): boolean {
  const title = article.title.trim();
  return /^retraction\.?$/i.test(title) || /retraction notice/i.test(title);
}

function scoreArticleForQuery(article: PubMedArticle, context: { originalQuery: string; outcomeTags: string[] }): number {
  if (isRetractionLike(article)) return Number.NEGATIVE_INFINITY;
  const title = article.title.toLowerCase();
  const abstract = article.abstractText.toLowerCase();
  const combined = `${title} ${abstract}`;
  let score = 0;

  const asksAorticDissection = /大動脈解離|aortic dissection|dissection/i.test(context.originalQuery);
  const asksRenal = context.outcomeTags.some((tag) => tag === "renal-failure" || tag === "dialysis");
  const asksMesenteric = context.outcomeTags.some((tag) => tag === "mesenteric-ischemia" || tag === "visceral-malperfusion");
  const asksArds = context.outcomeTags.some((tag) => tag === "ards" || tag === "respiratory-complication");
  const asksTracheostomy = context.outcomeTags.some((tag) => tag === "tracheostomy" || tag === "prolonged-ventilation");
  const asksStroke = context.outcomeTags.some((tag) => tag === "stroke" || tag === "neurologic-dysfunction");
  const asksMortality = context.outcomeTags.includes("mortality");
  const asksBleeding = context.outcomeTags.some((tag) => tag === "bleeding" || tag === "reoperation");

  if (asksAorticDissection) {
    const hasAorticDissection = /aortic dissection|type a aortic dissection|ataad/.test(combined);
    if (!hasAorticDissection) return Number.NEGATIVE_INFINITY;
    const explicitlyAsksTypeB = /type\s*b|stanford\s*b|b型/i.test(context.originalQuery);
    const hasAcuteTypeAContext = /type\s*a|stanford\s*a|\bataad\b|acute type a/.test(combined);
    const titleHasDissection = /aortic dissection/.test(title);
    if (!explicitlyAsksTypeB && !hasAcuteTypeAContext && !titleHasDissection) return Number.NEGATIVE_INFINITY;
    const consentDefaultTypeAContext = !explicitlyAsksTypeB && /type\s*b|stanford\s*b|b型/.test(combined) && !hasAcuteTypeAContext;
    if (consentDefaultTypeAContext) return Number.NEGATIVE_INFINITY;
    score += /aortic dissection|type a aortic dissection|ataad/.test(title) ? 8 : 3;
    if (/type\s*a|stanford\s*a|\bataad\b|acute type a/.test(title)) score += 3;
  }
  const asksPostoperativeOrSurgical = /術後|手術|postoperative|surgery|surgical|repair|procedure|operation/i.test(context.originalQuery);
  if (asksPostoperativeOrSurgical) {
    const hasSurgicalContext = /postoperative|surgery|surgical|repair|procedure|operation|operative/.test(combined);
    const isEtiologyNotPostoperativeOutcome = /not postoperative|etiolog|associated with[^.]{0,120}aortic dissection|present with[^.]{0,120}aortic dissection/.test(combined)
      && !/postoperative|repair|surgery|surgical/.test(title);
    if (!hasSurgicalContext || isEtiologyNotPostoperativeOutcome) return Number.NEGATIVE_INFINITY;
  }

  const activeTopics = outcomeTopicsForTags(context.outcomeTags);
  if (activeTopics.length > 0) {
    const requestedTitleFocus = activeTopics.some((topic) => topic.titleFocusPattern.test(title));
    const hasRequestedOutcome = activeTopics.some((topic) => topic.answerPattern.test(combined));
    if (!hasRequestedOutcome) return Number.NEGATIVE_INFINITY;
    const answerSentence = findAnswerBearingSentence(`${article.title}. ${article.abstractText}`, activeTopics);
    if (!requestedTitleFocus && !answerSentence) return Number.NEGATIVE_INFINITY;
    const titleFocusesOtherKnownOutcome = OUTCOME_TOPICS.some((topic) =>
      !topic.tags.some((tag) => context.outcomeTags.includes(tag)) && topic.titleFocusPattern.test(title)
    );
    if (titleFocusesOtherKnownOutcome && !requestedTitleFocus && !answerSentence) return Number.NEGATIVE_INFINITY;
    score += requestedTitleFocus ? 10 : 4;
    if (answerSentence) score += 8;
  }
  if (asksRenal) {
    const hasRenal = /dialysis|renal replacement|acute kidney injury|acute renal failure|\barf\b|renal failure|kidney injury|postoperative renal/.test(combined);
    if (!hasRenal) return Number.NEGATIVE_INFINITY;
    const asksDialysis = /透析|dialysis/i.test(context.originalQuery) || context.outcomeTags.includes("dialysis");
    const hasDirectDialysis = /dialysis|renal replacement/.test(combined);
    score += /dialysis|renal replacement|acute kidney injury|acute renal failure|renal failure|kidney injury/.test(title) ? 10 : 4;
    if (asksDialysis && hasDirectDialysis) score += 6;
    if (asksDialysis && !hasDirectDialysis) return Number.NEGATIVE_INFINITY;
  }
  if (asksMesenteric) {
    const titleFocusesOtherBed = /lower limb|leg |renal|kidney|cerebral|brain|stroke|coronary|myocardial/.test(title)
      && !/mesenteric|visceral|bowel|intestinal/.test(title);
    if (titleFocusesOtherBed) return Number.NEGATIVE_INFINITY;
    const hasMesenteric = /mesenteric ischemia|bowel ischemia|intestinal ischemia|mesenteric malperfusion|visceral malperfusion|visceral ischemia/.test(combined);
    if (!hasMesenteric) return Number.NEGATIVE_INFINITY;
    if (/mesenteric ischemia|mesenteric malperfusion|bowel ischemia|intestinal ischemia/.test(title)) score += 14;
    else if (/visceral malperfusion|visceral ischemia/.test(title)) score += 12;
    else if (/malperfusion/.test(title)) score += 4;
    else score += 2;
    if (/mesenteric malperfusion|visceral malperfusion/.test(combined)) score += 3;
    if (/mortality|odds ratio|\bOR\b|multi-organ failure|revascularization|necrotic intestine/.test(combined)) score += 3;
  }
  if (asksArds) {
    const hasAcuteTypeADissectionContext = /acute (?:type a )?aortic dissection|type a aortic dissection|\bataad\b/.test(combined);
    if (asksAorticDissection && !hasAcuteTypeADissectionContext) return Number.NEGATIVE_INFINITY;
    const broadAneurysmOrTracheostomyCohort = /aneurysm|thoracoabdominal|tracheostomy/.test(title)
      && !/aortic dissection|type a aortic dissection|\bataad\b/.test(title);
    if (broadAneurysmOrTracheostomyCohort) return Number.NEGATIVE_INFINITY;
    const titleFocusesOtherOutcome = /stroke|renal|kidney|mesenteric|visceral|lower limb|bleeding|mortality in acute|death|prehospital death|ct finding|octogenarian/.test(title)
      && !/ards|acute respiratory distress|respiratory|pulmonary|lung injury|oxygenation/.test(title);
    if (titleFocusesOtherOutcome) return Number.NEGATIVE_INFINITY;
    const hasRespiratory = /\bards\b|acute respiratory distress syndrome|respiratory failure|pulmonary complication|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/.test(combined);
    const respiratoryOnlyAsCompositeEndpoint = /composite (?:outcome|endpoint)[^.]{0,180}respiratory failure|respiratory failure[^.]{0,180}composite (?:outcome|endpoint)/i.test(combined)
      && !/\bards\b|acute respiratory distress syndrome|pulmonary complication|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/.test(combined);
    const respiratoryOnlyInGeneralOutcomeList = /mortality[^.]{0,100}stroke[^.]{0,100}(?:renal failure|dialysis)[^.]{0,100}respiratory failure|permanent neurologic deficit[^.]{0,120}(?:new dialysis|dialysis)[^.]{0,120}respiratory failure/i.test(combined)
      && !/\bards\b|acute respiratory distress syndrome|pulmonary complication|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/.test(combined);
    const broadProtocolOrRegistryDefinition = /registry|rationale|design|definition criteria|protocol/i.test(title)
      && /secondary outcomes?|composite (?:outcome|endpoint)|definition criteria/i.test(combined)
      && !/\bards\b|acute respiratory distress syndrome|pulmonary complication|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/.test(combined);
    const broadPandemicSurgeryOutcome = /covid|pandemic|sars-cov-2/.test(title)
      && /mortality|morbidit|composite incidence|before versus during|during-pandemic|published cases/.test(combined)
      && !/\bards\b|acute respiratory distress syndrome|postoperative pulmonary complication|acute lung injury|oxygenation impairment|mechanical ventilation/.test(combined);
    if (!hasRespiratory || respiratoryOnlyAsCompositeEndpoint || respiratoryOnlyInGeneralOutcomeList || broadProtocolOrRegistryDefinition || broadPandemicSurgeryOutcome) return Number.NEGATIVE_INFINITY;
    if (/\bards\b|acute respiratory distress syndrome/.test(title)) score += 14;
    else if (/postoperative pulmonary complication|pulmonary complication|respiratory failure|acute lung injury|oxygenation impairment/.test(title)) score += 11;
    else if (/respiratory|pulmonary|lung/.test(title)) score += 6;
    else score += 2;
    if (/risk factor|predictive model|nomogram|incidence|outcome|mechanical ventilation|oxygenation/.test(combined)) score += 4;
    if (/predictive model|nomogram|acute respiratory distress syndrome|\bards\b/.test(title)) score += 5;
  }
  if (asksTracheostomy) {
    const hasAcuteTypeADissectionContext = /acute (?:type a )?aortic dissection|type a aortic dissection|\bataad\b/.test(combined);
    if (asksAorticDissection && !hasAcuteTypeADissectionContext) return Number.NEGATIVE_INFINITY;
    const hasTracheostomy = /tracheostomy|tracheotomy|prolonged mechanical ventilation|prolonged ventilation/.test(combined);
    if (!hasTracheostomy) return Number.NEGATIVE_INFINITY;
    const titleDirectlyFocusesTracheostomy = /tracheostomy|tracheotomy|prolonged (?:mechanical )?ventilation/.test(title);
    const hasAnswerBearingTracheostomyRate = /tracheostom(?:y|ies)[^.]{0,120}?(?:was|required|necessary|performed|rate|incidence)?[^.]{0,120}?\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*%[^.]{0,120}?tracheostom/.test(combined)
      || /prolonged (?:mechanical )?ventilation[^.]{0,120}?\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*%[^.]{0,120}?prolonged (?:mechanical )?ventilation/.test(combined);
    if (!titleDirectlyFocusesTracheostomy && !hasAnswerBearingTracheostomyRate) return Number.NEGATIVE_INFINITY;
    const broadAneurysmContextOnly = /aneurysm|thoracoabdominal|endovascular/.test(title)
      && !/aortic dissection|type a aortic dissection|\bataad\b/.test(title);
    if (broadAneurysmContextOnly) return Number.NEGATIVE_INFINITY;
    const titleFocusesOtherOutcome = /mortality in acute|mesenteric|visceral|stroke|inflammatory|malperfusion|tavi|octogenarian|cannulation|acute kidney injury/.test(title)
      && !titleDirectlyFocusesTracheostomy;
    if (titleFocusesOtherOutcome) return Number.NEGATIVE_INFINITY;
    if (/tracheostomy|tracheotomy/.test(title)) score += 14;
    else if (/prolonged (?:mechanical )?ventilation/.test(title)) score += 12;
    else score += 4;
    if (hasAnswerBearingTracheostomyRate) score += 8;
    if (/risk factor|predictor|incidence|outcome|associated|mortality|pneumonia|respiratory failure/.test(combined)) score += 4;
  }
  if (asksStroke) {
    const hasStroke = /stroke|neurologic|neurological|cerebral/.test(combined);
    if (!hasStroke) return Number.NEGATIVE_INFINITY;
    score += /stroke|neurologic|neurological/.test(title) ? 8 : 3;
  }
  if (asksMortality) {
    const hasMortality = /mortality|death|survival/.test(combined);
    if (!hasMortality) return Number.NEGATIVE_INFINITY;
    score += /mortality|survival/.test(title) ? 8 : 3;
  }
  if (asksBleeding) {
    const hasBleeding = /bleeding|hemorrhage|reoperation/.test(combined);
    if (!hasBleeding) return Number.NEGATIVE_INFINITY;
    score += /bleeding|hemorrhage|reoperation/.test(title) ? 8 : 3;
  }

  if (/\d+(?:\.\d+)?\s*%/.test(combined)) score += 2;
  if (/risk|outcome|postoperative|complication|predictor|associated/.test(combined)) score += 2;
  if (/review|meta-analysis|systematic/.test(title)) score += 1;
  if (/hypertensive emergencies|case report|editorial/.test(title)) score -= 5;
  return score;
}

function evidenceTagsForArticle(article: PubMedArticle, requestedTags: string[]): string[] {
  const combined = `${article.title} ${article.abstractText}`.toLowerCase();
  const tags: string[] = [];
  for (const tag of requestedTags) {
    if (tag === "dialysis") {
      if (/dialysis|renal replacement/.test(combined)) tags.push(tag);
      continue;
    }
    if (tag === "renal-failure") {
      if (/dialysis|renal replacement|acute kidney injury|\baki\b|acute renal failure|\barf\b|renal failure|kidney injury|postoperative renal/.test(combined)) tags.push(tag);
      continue;
    }
    const topic = OUTCOME_TOPICS.find((item) => item.tags.includes(tag));
    if (!topic || topic.answerPattern.test(combined) || topic.titleFocusPattern.test(combined)) tags.push(tag);
  }
  return Array.from(new Set(tags.length ? tags : requestedTags));
}

export function convertPubMedArticlesToEvidenceCards(
  articles: PubMedArticle[],
  context: { originalQuery: string; outcomeTags: string[] },
): EvidenceCard[] {
  return articles
    .map((article, index) => ({ article, index, score: scoreArticleForQuery(article, context) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ article }) => {
    const keyFindings = prioritizeKeyFindingsForQuery(extractKeyFindings(article.abstractText), article, context);
    const firstAuthor = article.authors[0] ? `${article.authors[0].split(" ")[0]} et al.` : "PubMed";
    const citation = `${firstAuthor} ${article.journal || "PubMed"}. ${article.year || "n.d."}. PMID: ${article.pmid}`;
    const clinicianSummary = summarizeForDoctor(article, keyFindings, context);
    const quotedSpan = keyFindings.join(" ");
    return {
      evidenceId: `PUBMED-${article.pmid}`,
      title: article.title,
      sourceType: "Review",
      claim: keyFindings[0] || article.title,
      displayForFamily: keyFindings[0]
        ? `選択したPubMed論文では、${keyFindings[0]}`
        : `選択したPubMed論文「${article.title}」を医師が患者説明用根拠として追加しました。`,
      confidence: "moderate",
      citation,
      pmid: article.pmid,
      origin: "medevidence-rag",
      quotedSpan,
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      retrievalStatus: "pubmed-verified",
      clinicianSummary,
      keyFindings,
      outcomeTags: evidenceTagsForArticle(article, context.outcomeTags),
      clinicalScope: `PubMed natural-language evidence search: ${context.originalQuery}`,
    } satisfies EvidenceCard;
  });
}

export async function searchPubMedEvidence(query: string, retmax = 5): Promise<{ plan: PubMedSearchPlan; evidence: EvidenceCard[] }> {
  const plan = buildPubMedNaturalLanguageSearch(query);
  const searchLimit = Math.max(retmax, 20);
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", plan.pubmedTerm);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", String(searchLimit));
  searchUrl.searchParams.set("sort", "relevance");

  const searchRes = await fetch(searchUrl, { headers: { accept: "application/json" } });
  if (!searchRes.ok) throw new Error(`PubMed esearch failed: ${searchRes.status}`);
  const searchJson = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
  const ids = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) return { plan, evidence: [] };

  const fetchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
  fetchUrl.searchParams.set("db", "pubmed");
  fetchUrl.searchParams.set("id", ids.join(","));
  fetchUrl.searchParams.set("retmode", "xml");
  const fetchRes = await fetch(fetchUrl, { headers: { accept: "application/xml,text/xml" } });
  if (!fetchRes.ok) throw new Error(`PubMed efetch failed: ${fetchRes.status}`);
  const xml = await fetchRes.text();
  const articles = parsePubMedEFetchXml(xml);
  return {
    plan,
    evidence: convertPubMedArticlesToEvidenceCards(articles, { originalQuery: query, outcomeTags: plan.outcomeTags }).slice(0, retmax),
  };
}
