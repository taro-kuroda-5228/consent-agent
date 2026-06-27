import type { EvidenceCard } from "./consent-demo";

export type PubMedSearchPlan = {
  originalQuery: string;
  pubmedTerm: string;
  explainForDoctor: string;
  outcomeTags: string[];
};

export type PubMedArticle = {
  pmid: string;
  title: string;
  abstractText: string;
  journal: string;
  year: string;
  authors: string[];
};

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

export function buildPubMedNaturalLanguageSearch(query: string): PubMedSearchPlan {
  const normalized = query.toLowerCase();
  const conceptTerms: string[] = [];
  const tags: string[] = [];
  const explanations: string[] = [];

  if (/大動脈解離|aortic dissection|dissection/.test(normalized)) {
    conceptTerms.push('(aortic dissection[Title/Abstract] OR acute type A aortic dissection[Title/Abstract] OR ATAAD[Title/Abstract])');
    explanations.push("大動脈解離/ATAAD");
  }
  if (/透析|腎不全|腎障害|dialysis|renal|kidney/.test(normalized)) {
    conceptTerms.push('(dialysis[Title/Abstract] OR renal failure[Title/Abstract] OR acute kidney injury[Title/Abstract] OR kidney injury[Title/Abstract])');
    tags.push("renal-failure", "dialysis");
    explanations.push("透析・腎不全リスク");
  }
  if (/脳梗塞|脳卒中|stroke/.test(normalized)) {
    conceptTerms.push('(stroke[Title/Abstract] OR neurologic[Title/Abstract] OR neurological[Title/Abstract])');
    tags.push("stroke", "neurologic-dysfunction");
    explanations.push("脳卒中/神経合併症");
  }
  if (/死亡|mortality|death/.test(normalized)) {
    conceptTerms.push('(mortality[Title/Abstract] OR death[Title/Abstract] OR survival[Title/Abstract])');
    tags.push("mortality");
    explanations.push("死亡率/生存率");
  }
  if (/出血|bleeding|hemorrhage/.test(normalized)) {
    conceptTerms.push('(bleeding[Title/Abstract] OR hemorrhage[Title/Abstract] OR reoperation[Title/Abstract])');
    tags.push("bleeding", "reoperation");
    explanations.push("出血/再手術");
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
    pubmedTerm,
    explainForDoctor: explanations.length > 0
      ? `自然文から ${explanations.join("、")} をPubMed検索語へ展開しました。`
      : "自然文をTitle/Abstract検索語へ展開しました。",
    outcomeTags: Array.from(new Set(tags)),
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
  const numericOutcome = sentences.filter((sentence) => /\d+(?:\.\d+)?\s*%|95\s*%\s*(?:confidence interval|CI)|odds ratio|risk ratio|\bOR\b|\bRR\b/i.test(sentence));
  const directOutcome = sentences.filter((sentence) => /dialysis|renal replacement|acute kidney injury|\bAKI\b|renal|kidney|mortality|stroke|bleeding|risk|outcome/i.test(sentence));
  return Array.from(new Set([...(numericOutcome.length ? numericOutcome : []), ...directOutcome, ...sentences]))
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

function summarizeForDoctor(keyFindings: string[], context: { originalQuery: string; outcomeTags: string[] }): string {
  const joined = keyFindings.join(" ");
  const asksRenal = context.outcomeTags.some((tag) => tag === "renal-failure" || tag === "dialysis");
  const akiPercent = joined.match(/(?:postoperative\s+)?AKI\s+(?:was\s+)?(\d+(?:\.\d+)?%)|incidence of postoperative AKI was (\d+(?:\.\d+)?%)/i);
  const dialysisPercent = joined.match(/dialysis[^.]{0,80}?(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?%)[^.]{0,80}?dialysis/i);
  const mortality = /mortality/i.test(joined);
  const riskHints: string[] = [];
  if (/cardiopulmonary bypass|\bCPB\b/i.test(joined)) riskHints.push("CPB時間");
  if (/operative time|手術時間/i.test(joined)) riskHints.push("手術時間");
  if (/advanced age|elderly|高齢/i.test(joined)) riskHints.push("高齢");
  if (/transfusion|pRBC|輸血/i.test(joined)) riskHints.push("輸血");
  if (/body mass index|BMI/i.test(joined)) riskHints.push("BMI高値");
  if (/preoperative kidney injury|術前腎障害/i.test(joined)) riskHints.push("術前腎障害");

  const incidence = akiPercent?.[1] || akiPercent?.[2] || dialysisPercent?.[1] || dialysisPercent?.[2];
  if (asksRenal && incidence) {
    const outcome = akiPercent ? "術後AKI" : "術後透析";
    const tail = [
      `${outcome} ${incidence}`,
      riskHints.length ? `主なリスク: ${riskHints.slice(0, 4).join("・")}` : "",
      mortality ? "AKI例で短期死亡増加" : "",
    ].filter(Boolean).join("。 ");
    return `${tail}。`;
  }

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
  const asksStroke = context.outcomeTags.some((tag) => tag === "stroke" || tag === "neurologic-dysfunction");
  const asksMortality = context.outcomeTags.includes("mortality");
  const asksBleeding = context.outcomeTags.some((tag) => tag === "bleeding" || tag === "reoperation");

  if (asksAorticDissection) {
    const hasAorticDissection = /aortic dissection|type a aortic dissection|ataad/.test(combined);
    if (!hasAorticDissection) return Number.NEGATIVE_INFINITY;
    score += /aortic dissection|type a aortic dissection|ataad/.test(title) ? 8 : 3;
  }
  if (asksRenal) {
    const hasRenal = /dialysis|renal replacement|acute kidney injury|renal failure|kidney injury|postoperative renal/.test(combined);
    if (!hasRenal) return Number.NEGATIVE_INFINITY;
    score += /dialysis|renal replacement|acute kidney injury|renal failure|kidney injury/.test(title) ? 10 : 4;
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

export function convertPubMedArticlesToEvidenceCards(
  articles: PubMedArticle[],
  context: { originalQuery: string; outcomeTags: string[] },
): EvidenceCard[] {
  return articles
    .map((article, index) => ({ article, index, score: scoreArticleForQuery(article, context) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ article }) => {
    const keyFindings = extractKeyFindings(article.abstractText);
    const firstAuthor = article.authors[0] ? `${article.authors[0].split(" ")[0]} et al.` : "PubMed";
    const citation = `${firstAuthor} ${article.journal || "PubMed"}. ${article.year || "n.d."}. PMID: ${article.pmid}`;
    const clinicianSummary = summarizeForDoctor(keyFindings, context);
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
      outcomeTags: Array.from(new Set(context.outcomeTags)),
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
