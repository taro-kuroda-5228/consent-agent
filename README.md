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

## Judge demo path

1. Open http://localhost:3000
2. Click the acute type A dissection quick case.
3. Review the physician-selected evidence cards and start the family explanation.
4. Copy the issued family link (`/family/<sessionId>`) and open it in a second tab — this is the family's phone.
5. On the family page, ask: `脳梗塞のリスクについて、もっと教えてください`.
6. Confirm the answer cites selected evidence ID `AAD-005`, shows the machine-verified citation badge, and does not invent unsupported risk estimates.
7. Complete the understanding check, write a concern, choose a consent intent, and submit.
8. Open `/doctor/<sessionId>/summary` — the live physician summary shows the AI decision (`consent_ready` / `needs_physician_followup`), unresolved questions only, and review/export actions.

## Grounding evaluation & CI gate

`npm run eval` runs a golden dataset (eval/golden-qa.json) checking that every answer
cites only physician-selected evidence, that every percentage in an answer exists verbatim
in the selected sources, and that unanswerable questions escalate to the physician.
GitHub Actions runs this as a merge gate (`grounding-eval` job), so a prompt or retrieval
change that reintroduces hallucination cannot reach `main`. With `GEMINI_API_KEY` set the
same gate runs against the live Gemini path.

## Why this matters

Emergency consent conversations are high-stakes, time-constrained, and emotionally difficult. MedEvidence Consent Agent reduces physician explanation burden while preserving physician control, evidence traceability, and patient-family comprehension.

## Safety boundary (AI-mediated consent)

The agent autonomously runs explanation, physician-selected evidence Q&A, understanding
checks, and records the family's stated consent intent. At the end of a session it decides
`consent_ready` or `needs_physician_followup` and returns only the unresolved issues —
individual prognosis, unanswered questions, strong anxiety, comprehension gaps — to the
physician. AI does not obtain final consent in the legal sense: the exported record is not
a signed consent form, the physician gives final confirmation, and AI does not decide
surgical indication or replace physician judgment.

## What is real in Phase 1

- Runnable Next.js / React / TypeScript UI
- Deterministic TypeScript demo utilities
- Structured mock evidence cards
- Understanding-check scoring
- Safety flags that route risky questions back to physician review
- FHIR Consent-like draft JSON shape
- No real patient identifiers

## What is real now (Phase 2)

- Persisted consent sessions: physician console → family link → family responses →
  physician summary all share one session (in-memory by default, Supabase when configured)
- Family intent recording with autonomous `consent_ready` / `needs_physician_followup` decision
- Machine verification of citation spans (rejected spans never reach the family answer and are audited)
- Grounding eval suite + GitHub Actions merge gate (deterministic and live-Gemini modes)
- Cloud Run standalone container (`Dockerfile`, `output: "standalone"`)
- Physician review and anonymous JSON export wired to the UI
- Voice: Gemini TTS narration per explanation card (`/api/tts`, Web Speech API fallback)
  and push-to-talk voice questions (Web Speech API)
- AI assessment of free-text family concerns (escalates anxiety that keyword matching misses)
- HMAC-signed short-lived family link tokens with QR code (enforced when
  `CONSENT_AGENT_LINK_SECRET` is set)
- API-level smoke E2E (`npm run smoke:e2e`) running against the standalone server in CI

## What is still stubbed

- Physician authentication (magic link / SSO) is not implemented; the doctor console is open
- Supabase Realtime push (the physician summary polls every 5 seconds instead)

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


## Supabase productization layer

Supabase is the workflow backbone, not the medical reasoning engine. The hackathon demo keeps Gemini/Omni responsible for plain-language explanation, multimodal narration, understanding checks, and source-bounded family Q&A. Supabase adds the product evidence that this is more than a one-off demo:

- Persisted consent sessions, selected evidence, family responses, understanding evaluations, physician reviews, and export audit events.
- PostgreSQL RLS tenant isolation by institution via `profiles.institution_id` and `current_institution_id()`.
- Realtime physician review queue for `session_events` and `understanding_evaluations`, with 5 second polling fallback.
- Storage-ready evidence upload boundary for anonymous facility documents and future self-host/on-prem deployments.

### Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

When Supabase variables are absent outside production, the app uses anonymous in-memory mock mode so judges can still run the demo locally. Production requires explicit Supabase public URL and anon key.

### Supabase schema diagram

```text
institutions ─┬─ profiles
              ├─ consent_cases ─ consent_sessions ─┬─ selected_evidence ─ evidence_sources
              │                                     ├─ session_events
              │                                     ├─ understanding_evaluations
              │                                     └─ physician_reviews
              └─ audit_events ───────────────────────┘
```

### Safety line

- Anonymous demo only on Vercel/Supabase; no real patient PHI, names, MRNs, emails, phone numbers, signed consent forms, or raw clinical notes.
- Patient/family Q&A uses physician-selected evidence only; conflicting request evidence is ignored when persisted selected evidence exists.
- AI does not obtain final consent. Exported artifacts are not signed consent and always state physician review is required.
