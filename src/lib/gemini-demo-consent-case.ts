export const demoConsentCase = {
  caseId: 'demo-aortic-dissection',
  patientDisplay: '匿名患者 72歳男性',
  condition: '急性A型大動脈解離',
  procedure: '上行大動脈人工血管置換術',
  urgency: 'emergency',
  clinician: '担当医',
  targetDateTime: '2026-05-30T14:00:00+09:00',
  sourceEvidenceIds: ['facility:aortic-dissection-ic', 'guideline:jcs-aortic-disease', 'pmid:36322642'],
  clinicianNotes: '急性期の家族説明。腎不全、脳梗塞、出血、死亡リスクを重点確認。',
} as const;
