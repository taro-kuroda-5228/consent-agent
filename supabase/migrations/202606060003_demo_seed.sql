insert into public.institutions (id, name, demo_mode) values
  ('00000000-0000-0000-0000-000000000001', 'Consent Agent Hackathon Demo Hospital', true)
on conflict do nothing;

insert into public.consent_cases (id, institution_id, case_handle, diagnosis, planned_surgery, urgency, demo_only, phi_policy) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'demo-aortic-dissection', '急性A型大動脈解離', '上行大動脈人工血管置換術', 'emergency', true, 'anonymous-demo-only')
on conflict do nothing;

insert into public.evidence_sources (id, institution_id, origin, title, pmid, citation, quoted_span, key_findings, display_for_family, clinician_summary, outcome_tags, approved_for_demo) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'facility', '施設IC資料: 急性A型大動脈解離 緊急手術説明', 'FAC-001', '施設IC資料 v2026.05 / FAC-001', '緊急手術の目的、重大合併症、担当医による最終説明', '["破裂・心タンポナーデ・臓器血流障害の予防目的", "出血・脳梗塞・腎障害など重大リスクを明示"]'::jsonb, '当院の説明資料では、大動脈解離は緊急手術が必要な病態で、重要なリスクを医師が確認します。', '匿名デモ用施設IC資料。', array['consent','bleeding','stroke','renal-failure'], true)
on conflict do nothing;
