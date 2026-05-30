# Google Hackathon Readiness Implementation Plan

> **For Sinria/Hermes:** Use subagent-driven-development skill to implement this plan task-by-task if execution is delegated.

**Goal:** Bring the MedEvidence Consent Agent prototype to a polished, judge-ready Google Hackathon submission state.

**Architecture:** Keep the current Next.js 16 App Router single-page demo as the primary judged flow. Preserve the strongest product claim: family Q&A is strictly bounded to physician-selected evidence, with transparent evidence IDs and no unsupported medical inference. Use deterministic fallback behavior for demo stability, while making the Gemini/live-service path invisible to end users.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Vitest 4, ESLint 9, local deterministic evidence utilities, optional Gemini API through `@google/generative-ai`.

---

## Current State Snapshot

- Main app: `src/app/page.tsx`
- Evidence/Q&A core: `src/lib/consent-demo.ts`
- Physician preset intake: `src/lib/physician-intake.ts`
- API routes:
  - `src/app/api/explain/route.ts`
  - `src/app/api/qa/route.ts`
  - `src/app/api/evidence/suggest/route.ts`
  - `src/app/api/evidence/upload/route.ts`
- Tests:
  - `src/lib/consent-demo.test.ts`
  - `src/lib/physician-intake.test.ts`
  - `src/lib/jcs-upload-smoke.test.ts`
  - `src/app/page-ui-copy.test.ts`
- Verification as of 2026-05-19:
  - `npm test -- --run`: 26 passed
  - `npm run lint`: passed with no warnings after cleanup
  - `npm run build`: passed

## Non-Negotiable Product Behavior

1. Family Q&A must answer only from physician-selected evidence.
2. If selected evidence contains the answer, answer directly with `evidenceReferences`.
3. If selected evidence lacks the answer, say the selected reference material does not contain a direct answer.
4. Do not invent individual prognosis, success rate, mortality, or risk percentages.
5. Do not expose provider-specific wording such as Gemini in the user-facing UI.
6. Keep family-facing text short, calm, and readable on mobile.
7. The physician remains responsible for final consent and individual-risk explanation.

---

## Task 1: Preserve Clean Build/Test Baseline

**Objective:** Keep the repository in a judge-safe state before adding features.

**Files:**
- Modify only if needed: `src/app/page.tsx`
- Modify only if needed: `src/lib/consent-demo.ts`

**Steps:**
1. Run `npm test -- --run`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Fix only warnings/errors that do not change product behavior.

**Acceptance Criteria:**
- Tests pass.
- ESLint has no warnings.
- Production build passes.

**Already Done:** Removed unused `evidenceReady` state in `src/app/page.tsx` and unused `isSpinalCordInjuryRiskQuestion` in `src/lib/consent-demo.ts`; verified test/lint/build pass.

---

## Task 2: Add Judge-Facing README Submission Section

**Objective:** Make it obvious to judges how to run the demo, what to click, and what the innovation is.

**Status:** Done on 2026-05-19. Added README judge path / why-it-matters / safety boundary and `src/app/readme-submission-copy.test.ts`.

**Files:**
- Modify: `README.md`

**Step 1: Add a failing documentation/copy test**

Create or extend a README smoke test if desired, or use direct review for documentation-only work. Recommended minimal test file:

```ts
// src/app/readme-submission-copy.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

describe("hackathon README", () => {
  it("explains the judged demo path and safety boundary", () => {
    expect(readme).toContain("Judge demo path");
    expect(readme).toContain("physician-selected evidence");
    expect(readme).toContain("AI does not obtain final consent");
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- --run src/app/readme-submission-copy.test.ts`
Expected: FAIL until README is updated.

**Step 3: Update README**

Add sections:

```md
## Judge demo path

1. Open `/`.
2. Click the acute type A dissection quick case.
3. Review physician-selected evidence cards.
4. Start family explanation.
5. Ask: `脳梗塞のリスクについて、もっと教えてください`.
6. Confirm the answer cites selected evidence ID `AAD-005` and does not invent unsupported risk estimates.
7. Complete understanding check and view physician summary.

## Why this matters

Emergency consent conversations are high-stakes, time-constrained, and emotionally difficult. This demo shows how an AI agent can reduce physician explanation burden while preserving physician control, evidence traceability, and patient-family comprehension.

## Safety boundary

The system organizes explanation, evidence references, family Q&A, and understanding checks. It does not decide surgical indication, obtain final consent, or replace physician judgment.
```

**Step 4: Verify**

Run:
- `npm test -- --run`
- `npm run lint`
- `npm run build`

---

## Task 3: Add Demo Script / Pitch Notes

**Objective:** Give Taro a crisp 2-minute spoken path for judging.

**Files:**
- Create: `docs/demo-script.md`

**Content Outline:**

```md
# MedEvidence Consent Agent Demo Script

## 10-second problem
In emergency surgery, physicians must explain complex evidence quickly while families are anxious and overloaded.

## 20-second solution
MedEvidence Consent Agent converts physician-selected evidence into family-facing explanation, evidence-bounded Q&A, understanding checks, and a physician handoff summary.

## 60-second click path
...

## Safety line
The AI never obtains consent. It only supports explanation and documentation under physician control.

## Closing
This improves physician throughput, family comprehension, and hospital trust while staying inside a conservative medical safety boundary.
```

**Verification:**
- Manual read-through: should fit within 2 minutes.
- `npm test -- --run && npm run lint && npm run build` still pass because docs changes must not break the app.

---

## Task 4: Strengthen Empty/Unselected Evidence Guardrail

**Objective:** Ensure Q&A never silently falls back to default evidence when the physician intentionally selects none.

**Files:**
- Test: `src/lib/consent-demo.test.ts`
- Modify: `src/app/api/qa/route.ts` if needed
- Modify: `src/app/page.tsx` if the client currently sends ambiguous empty arrays

**Step 1: Write failing test**

Add a test that calls `synthesizeEvidenceBoundQA` with `selectedEvidence: []` and asks a known answerable question.

Expected:
- Answer says no selected reference contains a direct answer.
- `evidenceReferences` is `[]`.
- `requiresDoctorReview` is `true`.

**Step 2: Verify RED**

Run: `npm test -- --run src/lib/consent-demo.test.ts -t "empty selected evidence"`

**Step 3: Implement minimal fix**

If the core function already behaves correctly, ensure API/client distinguishes:
- Missing `selectedEvidenceIds` → demo default allowed.
- Explicit empty `selectedEvidenceIds: []` → no evidence selected; no fallback.

**Step 4: Verify GREEN**

Run full verification:
- `npm test -- --run`
- `npm run lint`
- `npm run build`

---

## Task 5: Improve Physician Summary Export for Judge Readability

**Objective:** Make final screen clearly show what the doctor gets back after family explanation.

**Files:**
- Test: add/extend `src/app/page-ui-copy.test.ts`
- Modify: `src/app/page.tsx`

**Target UI Copy:**
- `家族が理解できたこと`
- `追加説明が必要なこと`
- `家族から出た質問`
- `選択済み根拠ID`
- `説明記録JSON`

**Acceptance Criteria:**
- Final screen can be understood from screenshots alone.
- CTA buttons remain readable on mobile.
- Provider names remain hidden.

---

## Task 6: Add One Screenshot-Friendly Demo Seed

**Objective:** Reduce live demo friction by pre-filling the strongest family question after entering the family Q&A step.

**Files:**
- Test: `src/app/page-ui-copy.test.ts`
- Modify: `src/app/page.tsx`

**Behavior:**
- Provide clickable sample questions:
  - `なぜすぐに手術が必要なのですか？`
  - `脳梗塞のリスクについて、もっと教えてください`
  - `対麻痺のリスクは？`
- Each button should call existing `handleFreeQuestion(question)`.

**Acceptance Criteria:**
- Demo operator can show strong evidence-bounded answers without typing Japanese live.
- Existing manual free-text question still works.

---

## Task 7: Final Release Verification Checklist

**Objective:** Produce a final judge-ready state.

**Commands:**

```bash
npm test -- --run
npm run lint
npm run build
```

**Manual Demo Checklist:**

1. Open `/`.
2. Click acute type A dissection preset.
3. Confirm evidence cards are selected.
4. Start family explanation.
5. Ask stroke risk sample question.
6. Confirm answer contains `5%` and `95%信頼区間4〜7%` only when `AAD-005` is selected.
7. Unselect `AAD-005` and confirm the system no longer gives that number.
8. Complete understanding check.
9. Show physician summary and JSON/export buttons.
10. Confirm no provider-specific text is visible in user-facing UI.

---

## Immediate Priority Order

1. README judge section.
2. Demo script.
3. Empty selected evidence guardrail.
4. Screenshot-friendly sample Q buttons.
5. Final screen readability polish.
6. Final full verification and deployment/submission packaging.
