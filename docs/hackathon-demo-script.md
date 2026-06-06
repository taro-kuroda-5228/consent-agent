# Consent Agent 2-minute hackathon demo script

0:00-0:20 Problem: emergency surgery consent is time-constrained, emotionally difficult, and understanding gaps are easy to miss.

0:20-0:50 Gemini/Omni: open `/sessions`, show the anonymous acute type A aortic dissection case, multimodal explanation text/video storyboard/audio narration, and family understanding check.

0:50-1:20 Supabase: point at Persisted session, RLS tenant isolated, Realtime physician review, and the audit timeline events: explanation_generated, family_response, understanding_evaluated, qa_answered, physician_reviewed, export_created.

1:20-1:45 Safety: family answers use physician-selected evidence only; the record is not signed consent; physician final review is mandatory; anonymous demo only.

1:45-2:00 Productization: facility evidence, PubMed candidate approval, RLS, immutable audit, and GCP/on-prem PostgreSQL/Supabase self-host path.
