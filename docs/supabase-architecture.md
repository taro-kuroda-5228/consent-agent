# Supabase architecture

Supabase stores workflow state for the Consent Agent:

- `consent_sessions`: case/session lifecycle and model version.
- `selected_evidence`: physician-curated evidence allowed for patient/family explanation.
- `session_events`: explanation, family response, QA, safety escalation, review, export events.
- `understanding_evaluations`: checkpoint-level comprehension and escalation state.
- `physician_reviews`: attending review status and not-signed-consent notice.
- `audit_events`: insert-only audit metadata.

RLS uses `profiles.institution_id` through `current_institution_id()` so institution members only see their tenant's records. Service-role use is reserved for server-side trusted operations and must not be exposed to the browser.

Gemini remains the interaction intelligence layer. Supabase is persistence, audit, review queue, storage metadata, and realtime delivery.
