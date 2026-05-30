# Acute Aortic Dissection Consent Clinical MVP Implementation Plan

> **For Sinria/Hermes:** Treat this as a clinical-product MVP plan, not a hackathon sample. Use subagent-driven-development task-by-task if delegating implementation.

**Goal:** Build MedEvidence Consent Agent to a level where acute Stanford type A aortic dissection emergency surgery consent can be demonstrated as a plausible real hospital workflow: physician-controlled, evidence-bounded, auditable, and safe under emergency constraints.

**Architecture:** The MVP is a narrow vertical product for one high-stakes clinical pathway: acute type A aortic dissection emergency surgery. The agent must not behave like a general medical chatbot. It must operate as a consent workflow system: physician case setup -> institution/reference evidence selection -> family explanation -> evidence-bounded Q&A -> comprehension check -> physician handoff summary -> audit/export artifact.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, deterministic evidence core in `src/lib/consent-demo.ts`, API routes under `src/app/api/*`, optional Gemini generation through `src/lib/gemini.ts`, future Google Cloud/FHIR/Healthcare API integration.

---

## Product Positioning

This MVP is not “AI explains surgery.”

It is:

> A physician-controlled emergency consent workflow agent for acute type A aortic dissection surgery, using only selected evidence and institution-approved materials to help families understand, ask questions, and return a structured summary to the physician.

The strongest product claim is conservative and hospital-compatible:

1. The physician remains the legal and clinical decision-maker.
2. The agent only uses selected evidence/materials.
3. The agent refuses unsupported inference.
4. The agent documents what was explained, asked, understood, and escalated.
5. The system is designed for emergency time pressure.

---

## MVP Scope: Acute Type A Aortic Dissection Surgery

### Included clinical pathway

- Diagnosis: Stanford type A acute aortic dissection / acute type A aortic dissection.
- Setting: Emergency department / ICU / cardiovascular surgery handoff.
- Procedure family:
  - Emergency ascending aortic graft replacement.
  - Hemiarch replacement when applicable.
  - Total arch replacement / frozen elephant trunk only when physician-selected evidence supports it.
- Family explanation target:
  - Disease mechanism.
  - Why emergency surgery is needed.
  - Procedure objective.
  - Major risks: mortality, stroke/cerebral infarction, bleeding/transfusion/reoperation, renal failure/dialysis, spinal cord injury/paraplegia where relevant, prolonged ICU, infection.
  - Alternative/non-operative risk boundary without pushing consent.

### Explicitly excluded from MVP

- General consent for all surgeries.
- Autonomous clinical decision-making.
- Individual survival prediction.
- AI-obtained consent.
- Open-ended medical Q&A not bounded by physician-selected materials.
- Real patient data ingestion before compliance/security review.

---

## Clinical-Product Quality Bar

For this MVP to be credible as a hospital product, each feature must satisfy these bars.

### 1. Evidence governance

- Every family-facing claim must be traceable to one or more selected evidence IDs.
- Evidence can come from:
  - Institution consent document.
  - Society guideline.
  - PubMed-indexed paper/registry/review.
  - Physician-uploaded reference material.
- The system must distinguish:
  - candidate evidence suggested by AI/RAG;
  - physician-selected evidence allowed for family explanation;
  - unselected evidence that must not be cited.
- Numeric risks must only appear if the selected source contains the numeric span.

### 2. Safety refusal behavior

The system must refuse or escalate when:

- selected evidence does not contain an answer;
- question asks for individual prognosis/success chance;
- family asks whether they “should consent”;
- question requires patient-specific imaging/lab/hemodynamic context;
- question asks for non-MVP conditions.

Refusal wording should be useful, not evasive:

> 選択済み参考資料内には、この質問に直接答えられる記載が見つかりません。担当医に確認する質問として記録します。

### 3. Physician workflow fit

The physician must be able to complete setup quickly:

- choose acute type A dissection pathway;
- confirm procedure variant;
- select/approve evidence;
- start explanation within 30-60 seconds;
- see family questions requiring follow-up;
- export structured explanation record.

### 4. Family UX

- No provider names or AI implementation details.
- No jargon unless immediately explained.
- Short sections; mobile-first.
- Calm tone, no coercive wording.
- Clear markers for:
  - “医師選択済み根拠のみ”
  - “参照ID”
  - “医師に確認する質問として記録”

### 5. Auditability

Each session should ultimately produce a structured record containing:

- case pathway ID;
- physician-selected evidence IDs;
- generated/explained card IDs;
- family questions;
- answer evidence references;
- unanswered/escalated questions;
- comprehension check results;
- timestamp;
- demo/non-PHI flag for current phase.

---

## Implementation Phases

## Phase A: Productize the Current Demo into a Real Vertical MVP

### Task A1: Encode the clinical pathway explicitly

**Objective:** Replace “generic demo case” assumptions with a formal ATAAD pathway model.

**Files:**
- Create: `src/lib/clinical-pathways.ts`
- Test: `src/lib/clinical-pathways.test.ts`
- Modify: `src/lib/physician-intake.ts`
- Modify: `src/app/page.tsx`

**Data shape:**

```ts
export type ClinicalPathwayId = "ataad-emergency-surgery";

export type ClinicalPathway = {
  id: ClinicalPathwayId;
  label: string;
  diagnosisTerms: string[];
  allowedProcedureVariants: string[];
  requiredExplanationTopics: string[];
  majorRiskTopics: string[];
  outOfScopeTopics: string[];
};
```

**Acceptance criteria:**
- UI shows the pathway as `急性A型大動脈解離・緊急手術`.
- Q&A/context carries `pathwayId`.
- Tests prove the MVP has exactly one active clinical pathway and refuses unknown pathway IDs.

---

### Task A2: Add evidence sufficiency checks before explanation starts

**Objective:** Physician cannot unknowingly start a family explanation without minimum required evidence coverage.

**Files:**
- Modify: `src/lib/consent-demo.ts`
- Test: `src/lib/consent-demo.test.ts`
- Modify: `src/app/page.tsx`

**Minimum evidence topics for ATAAD MVP:**
- disease definition / mechanism;
- emergency need / rupture or tamponade risk;
- procedure purpose;
- at least two major complication categories;
- AI/physician boundary.

**Expected behavior:**
- If coverage is sufficient: show `根拠カバレッジ: 説明開始可能`.
- If insufficient: show missing topics and allow physician override only with visible warning.

**TDD:**
- Write a test where only `AAD-005` is selected. Expected: insufficient because disease/emergency purpose is missing.
- Write a test where `FAC-001 + AAD-005` are selected. Expected: sufficient for demo path.

---

### Task A3: Prevent default fallback when physician intentionally selects no evidence

**Objective:** Empty physician selection must not silently revert to default evidence.

**Files:**
- Modify: `src/app/api/qa/route.ts`
- Modify: `src/app/api/explain/route.ts`
- Test: `src/lib/consent-demo.test.ts` or API-route-adjacent utility tests.

**Rule:**
- `selectedEvidenceIds === undefined` means demo/default startup may apply.
- `selectedEvidenceIds: []` means physician selected no evidence; answer/explanation must not cite default evidence.

**Acceptance criteria:**
- Asking known stroke-risk question with explicit empty selected IDs returns no cited evidence.
- Build/test/lint pass.

---

### Task A4: Add sample questions as “clinical quick questions,” not judge samples

**Objective:** Provide clinically realistic family questions for speed and reliability without looking like fake demo buttons.

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/app/page-ui-copy.test.ts`

**UI label:**
- `よくある家族の質問`

**Questions:**
- `なぜ今すぐ手術が必要なのですか？`
- `脳梗塞のリスクについて教えてください。`
- `出血や輸血の可能性はありますか？`
- `対麻痺のリスクはありますか？`
- `手術しない場合はどうなりますか？`

**Acceptance criteria:**
- Buttons call the same Q&A path as free text.
- No “sample/demo” wording is visible.
- If selected evidence lacks the answer, the system escalates instead of inventing.

---

## Phase B: Clinical Safety and Hospital Trust Layer

### Task B1: Add answer classification and escalation reasons

**Objective:** Physician summary should show why each family question was answered or escalated.

**Files:**
- Modify: `src/lib/consent-demo.ts`
- Modify: `src/app/page.tsx`
- Test: `src/lib/consent-demo.test.ts`

**Add fields to Q&A result:**

```ts
answerStatus: "answered-from-selected-evidence" | "no-selected-evidence" | "needs-physician-specific-judgment" | "consent-decision-refusal";
escalationReason?: string;
```

**Acceptance criteria:**
- Individual prognosis questions have `needs-physician-specific-judgment`.
- Consent advice questions have `consent-decision-refusal`.
- Evidence-backed questions have `answered-from-selected-evidence`.

---

### Task B2: Build physician handoff summary as a structured clinical artifact

**Objective:** Final screen should look like a real physician handoff, not a UI demo ending.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/lib/consent-demo.ts`
- Test: `src/lib/consent-demo.test.ts`

**Sections:**
- Explanation topics completed.
- Evidence IDs used.
- Family questions answered with evidence IDs.
- Questions needing physician follow-up.
- Understanding check results.
- Non-consent disclaimer.

**Acceptance criteria:**
- JSON export includes the above fields.
- UI copy is screenshot-readable.

---

### Task B3: Add clinical disclaimer without weakening product confidence

**Objective:** The product must be safe without sounding like it is merely a toy.

**Wording principle:**
- Avoid: “This is just a demo.”
- Use: “This version uses anonymized demonstration data and does not obtain final consent.”

**Files:**
- Modify: `README.md`
- Modify: `src/app/page.tsx`
- Test: `src/app/page-ui-copy.test.ts`

---

## Phase C: Real Hospital Deployment Readiness

### Task C1: Create hospital deployment roadmap document

**Files:**
- Create: `docs/hospital-deployment-roadmap.md`

**Must include:**
- anonymous dry-run deployment;
- department pilot;
- institution document ingestion;
- medical safety committee review;
- audit log requirements;
- EHR/FHIR integration;
- access control and PHI handling;
- post-market monitoring / quality improvement.

---

### Task C2: Create Google collaboration architecture document

**Files:**
- Create: `docs/google-collaboration.md`

**Must include:**
- Gemini/Vertex AI role;
- Cloud Run deployment model;
- Healthcare API/FHIR integration;
- Cloud Storage for institution-approved documents;
- BigQuery analytics on anonymized explanation quality;
- IAM/VPC Service Controls/Audit Logs;
- why this is a workflow-native medical agent, not generic chatbot.

---

### Task C3: Add security/privacy threat model

**Files:**
- Create: `docs/security-privacy-threat-model.md`

**Must include:**
- no PHI in current MVP;
- future PHI data boundaries;
- prompt-injection through uploaded documents;
- evidence provenance tampering;
- audit log integrity;
- model hallucination controls;
- human-in-the-loop requirements.

---

## Definition of “Real Clinical MVP” for This Project

The MVP is ready to present as a serious hospital product only when all are true:

- [ ] A physician can complete ATAAD case setup in under 60 seconds.
- [ ] Evidence coverage is checked before family explanation.
- [ ] Family Q&A never cites unselected evidence.
- [ ] Numeric risk answers only use numeric spans from selected evidence.
- [ ] Unsupported questions are escalated and recorded.
- [ ] Final physician summary is clinically useful.
- [ ] Export artifact contains explanation, evidence, Q&A, comprehension, escalation, and boundary fields.
- [ ] README, Google collaboration doc, hospital deployment roadmap, and threat model are present.
- [ ] `npm test -- --run`, `npm run lint`, and `npm run build` pass.

---

## Immediate Execution Order

1. Task A3: explicit empty-evidence guardrail.
2. Task A2: evidence sufficiency checks.
3. Task A4: clinically framed quick family questions.
4. Task B1: answer status / escalation reason.
5. Task B2: physician handoff summary artifact.
6. Task C1-C3: deployment, Google collaboration, threat model docs.
7. Final pass: README and demo script rewritten around real clinical MVP, not sample/demo.
