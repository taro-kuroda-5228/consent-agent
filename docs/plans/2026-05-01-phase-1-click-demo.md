# MedEvidence Consent Agent Phase 1 Click Demo Implementation Plan

> **For Hermes:** Implement directly in small verified steps. Phase 1 is a runnable click demo; mock data is allowed, but secrets and real patient data are forbidden.

**Goal:** Build a local Next.js click demo for acute type A aortic dissection consent support with deterministic mock agents and a clear path to Phase 2 live Gemini + MedEvidence RAG.

**Architecture:** A single Next.js App Router project under `~/projects/consent-agent`. Phase 1 uses static mock evidence and deterministic TypeScript utilities so the UI can be tested and later swapped to live API clients. The demo is one vertical workflow: physician setup → family explanation → evidence drawer → understanding check → physician summary/FHIR-like export.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Vitest for pure utility tests.

---

## Prototype Contract

Prototype Question: Can a judge understand the value of an AI-native emergency surgical consent workflow in under 3 minutes?
User: Physician presenter and family persona for demo.
Demo path: Select dissection case → generate explanation → inspect evidence → answer understanding check → export physician summary.
Fake/stubbed parts: Gemini responses, MedEvidence `/api/search/v3` retrieval, auth, audit persistence, Firestore, Cloud Run.
Real parts: Runnable UI, deterministic structured data, safety boundaries, FHIR Consent-like JSON shape.
Timebox: Phase 1 click demo.
Success criteria: Local build passes; `/` shows the full flow; no secrets or real patient data; mock evidence clearly labeled.
Kill criteria: If the flow cannot be explained in 3 minutes, reduce screens rather than add features.

## Task 1: Add utility tests first

**Objective:** Define expected behavior for mock evidence retrieval, explanation generation, understanding check, and export payload.

**Files:**
- Create: `src/lib/consent-demo.test.ts`
- Create later: `src/lib/consent-demo.ts`
- Modify: `package.json`

**Verification:**
- Run `npm test -- --run`; expected RED before implementation, GREEN after implementation.

## Task 2: Implement deterministic demo utilities

**Objective:** Add typed mock case, evidence cards, explanation cards, safety flags, quiz scoring, and FHIR-like export builder.

**Files:**
- Create: `src/lib/consent-demo.ts`

**Verification:**
- `npm test -- --run` passes.

## Task 3: Replace starter page with Phase 1 demo UI

**Objective:** Build the clickable single-page workflow with four sections and evidence drawer.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Verification:**
- `npm run lint` passes.
- `npm run build` passes.

## Task 4: Add README handoff

**Objective:** Document how to run the demo and what is fake vs real.

**Files:**
- Modify: `README.md`

**Verification:**
- README includes Phase 1 status, run commands, fake/real parts, Phase 2 target `/api/search/v3`.

## Task 5: Smoke check local app

**Objective:** Confirm the page renders in browser and no console errors appear on initial load.

**Verification:**
- Start dev server.
- Open browser to localhost.
- Confirm MedEvidence Consent Agent content is visible.
