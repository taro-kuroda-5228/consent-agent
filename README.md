# MedEvidence Consent Agent

Phase 1 click demo for Google Hackathon.

## Purpose

This prototype demonstrates an AI-native consent support workflow for acute type A aortic dissection emergency surgery:

1. Physician setup
2. Family-facing explanation cards
3. Evidence drawer with PMID-backed mock citations
4. Understanding check and safety triage
5. Physician summary / FHIR Consent-like JSON export

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Verification commands

```bash
npm test -- --run
npm run lint
npm run build
```

## What is real in Phase 1

- Runnable Next.js / React / TypeScript UI
- Deterministic TypeScript demo utilities
- Structured mock evidence cards
- Understanding-check scoring
- Safety flags that route risky questions back to physician review
- FHIR Consent-like draft JSON shape
- No real patient identifiers

## What is fake or stubbed in Phase 1

- Gemini API responses are mocked by deterministic explanation cards
- MedEvidence RAG retrieval is mocked by local evidence data
- Authentication is not implemented
- Firestore/audit persistence is not implemented
- Cloud Run deployment is not implemented

## Phase 2 target

Connect the demo workflow to live services:

- Consent Agent API endpoint sends query to MedEvidence `/api/search/v3`
- Returned citations with PMID are normalized into evidence cards
- Evidence snippets are injected into Gemini prompt templates
- Gemini generates family-facing explanation cards and physician summaries
- Mock retrieval remains only as fallback/demo-stability mode

## Data and secrets notes

- Do not commit API keys, service account JSON, real patient names, chart IDs, DICOM, consent forms, or raw clinical notes.
- Use anonymous demo data only until Medical Horizon security/compliance review is complete.
- AI supports explanation, organization, understanding check, and documentation. AI does not obtain final consent or replace physician judgment.
