# Clinical evidence search architecture for Consent Agent

## Purpose

Consent Agent must remain useful after the Google hackathon without becoming a fragile dictionary/rule engine. The application should help physicians prepare family explanations from approved materials and PubMed evidence, while keeping final consent and patient-specific risk judgment with the physician.

## Core decision

The product design is **not** disease-specific hard-coding. It uses:

1. **Structured clinical query** parsing from natural-language questions.
2. Broad PubMed retrieval from condition, context, outcome, timing, and question-type concepts.
3. **topic-level clinical relevance ranking** to prefer papers that directly answer the clinical question.
4. Physician review before a retrieved paper becomes patient/family explanation evidence.
5. Failed or noisy search examples saved as a **regression fixture** for relevance evaluation, not as product-wide exclusion behavior.

## Structured clinical query

A natural-language question is converted into a reusable shape:

```ts
type ClinicalQuery = {
  rawQuery: string;
  language: "ja" | "en";
  conditionConcepts: string[];
  interventionOrContextConcepts: string[];
  outcomeConcepts: string[];
  timingConcepts: string[];
  questionType: "risk" | "benefit" | "diagnosis" | "prognosis" | "treatment" | "complication" | "general";
  relevanceStrategy: "topic-level-clinical-relevance";
};
```

Example: `大動脈解離術後ARDSのリスク`

```json
{
  "conditionConcepts": ["acute aortic dissection", "type A aortic dissection"],
  "interventionOrContextConcepts": ["surgery"],
  "outcomeConcepts": ["acute respiratory distress syndrome"],
  "timingConcepts": ["postoperative", "perioperative"],
  "questionType": "risk"
}
```

## Ranking behavior

PubMed search should retrieve broadly, then rank and summarize conservatively.

Preferred evidence:

- Directly studies the requested condition/context and outcome.
- Treats the outcome as a main endpoint, risk factor, or clinically central result.
- Provides enough abstract/title context for physician review.

Downranked or omitted evidence:

- Outcome appears only as a secondary item in a broad complication list.
- Paper is a retraction notice.
- Animal/non-human or unrelated population evidence for a family-facing consent question.
- General perioperative papers that do not directly answer the structured clinical question.

## Regression fixture policy

When testing finds a noisy paper, store it as an evaluation example:

```json
{
  "query": "大動脈解離術後ARDSのリスク",
  "pmid": "example",
  "label": "not_directly_relevant",
  "reason": "outcome appears only as a broad postoperative complication item"
}
```

Do **not** convert this into a permanent product-wide PMID block. The goal is to improve relevance behavior generally.

## Hackathon-before-submission implementation scope

Must be implemented and verified before submission:

- Structured clinical query metadata in the PubMed search plan.
- App copy explaining that PubMed candidates are physician-review drafts.
- Search result cards that show physician summary, key findings, citation, and outcome tags.
- Tests proving ARDS/postoperative, dialysis/renal failure, mesenteric ischemia, and retraction filtering behavior.
- Documentation that positions supervised learning as future work, not a current dependency.

Out of scope before submission:

- Training a supervised reranker.
- Model distillation.
- Large-scale clinician-labeled relevance dataset construction.

## Future work

Supervised reranker / distillation is intentionally deferred until after application launch, when real clinician feedback and query/article relevance labels can be collected. At that point, the accumulated regression fixtures and physician review labels can support a smaller biomedical reranker, with LLM judgment reserved for explanations and edge cases.

## Safety boundary

- Patient/family Q&A cites only physician-selected evidence.
- PubMed candidates are not automatically shown as patient-facing facts.
- The AI does not obtain final consent, decide surgery indication, or state individualized prognosis.
- Any deployment, real patient data connection, or external send remains approval-gated.
