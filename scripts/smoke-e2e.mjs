// 一気通貫スモークテスト: 医師の説明開始 → 家族ビュー → 根拠限定QA → 回答送信 →
// consent_ready 判定 → 医師サマリー → 匿名エクスポート → TTS可用性。
// 使い方: BASE_URL=http://localhost:3000 node scripts/smoke-e2e.mjs

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function json(res) {
  const body = await res.json();
  return body;
}

console.log(`smoke-e2e against ${BASE_URL}`);

// 1. 医師が説明を開始する
const explainRes = await fetch(`${BASE_URL}/api/explain`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    diagnosis: 'Stanford A型急性大動脈解離',
    plannedSurgery: '上行大動脈人工血管置換術',
    risks: ['死亡', '脳梗塞', '出血'],
    selectedEvidenceIds: ['FAC-001', 'AAD-003', 'AAD-005'],
  }),
});
check('explain returns 200', explainRes.status === 200, `status=${explainRes.status}`);
const explain = await json(explainRes);
const sessionId = explain.sessionId;
const familyToken = explain.familyAccessToken;
check('explain returns sessionId + familyAccessToken', Boolean(sessionId && familyToken));
check('explanation has cards', Array.isArray(explain.explanation) && explain.explanation.length >= 3);

// 2. 家族ビュー
const viewRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}?t=${encodeURIComponent(familyToken)}`);
check('family session view returns 200', viewRes.status === 200, `status=${viewRes.status}`);
const view = await json(viewRes);
check('view exposes evidence + understanding questions', view.evidence?.length >= 3 && view.understandingQuestions?.length === 4);

// 3. 根拠限定QA（選択済み根拠から回答できる質問）
const qaRes = await fetch(`${BASE_URL}/api/qa`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: '脳梗塞のリスクについて教えてください',
    diagnosis: 'Stanford A型急性大動脈解離',
    sessionId,
    familyToken,
  }),
});
check('qa returns 200', qaRes.status === 200, `status=${qaRes.status}`);
const qa = await json(qaRes);
check('qa cites only selected evidence', Array.isArray(qa.evidenceReferences) && qa.evidenceReferences.length > 0 && qa.evidenceReferences.every((id) => ['FAC-001', 'AAD-003', 'AAD-005'].includes(id)), JSON.stringify(qa.evidenceReferences));

// 4. 理解確認 + 同意意思の送信
const responsesRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/responses`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    answers: [
      { questionId: 'q1', selectedIndex: 1 },
      { questionId: 'q2', selectedIndex: 1 },
      { questionId: 'q3', selectedIndex: 0 },
      { questionId: 'q4', selectedIndex: 2 },
    ],
    concerns: '',
    intent: 'agrees',
    familyToken,
  }),
});
check('responses returns 200', responsesRes.status === 200, `status=${responsesRes.status}`);
const responses = await json(responsesRes);
check('autonomous decision is consent_ready', responses.decision?.decision === 'consent_ready', JSON.stringify(responses.decision));

// 5. 医師サマリー
const summaryRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/summary`);
check('doctor summary returns 200', summaryRes.status === 200, `status=${summaryRes.status}`);
const summary = await json(summaryRes);
check('summary shows full understanding score', summary.understandingScore?.correct === 4 && summary.understandingScore?.total === 4, JSON.stringify(summary.understandingScore));
check('summary carries consent decision', summary.consentDecision?.decision === 'consent_ready');

// 6. 匿名エクスポート
const exportRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/export`);
check('export returns 200', exportRes.status === 200, `status=${exportRes.status}`);
const exported = await json(exportRes);
check('export includes not-signed-consent notice', typeof exported.notSignedConsentNotice === 'string' && exported.notSignedConsentNotice.includes('署名済み同意ではなく'));
check('export includes audit timeline', Array.isArray(exported.auditTimeline) && exported.auditTimeline.length >= 4, `events=${exported.auditTimeline?.length}`);

// 7. TTS 可用性（キーが無い環境では 503 + クライアントフォールバックが正しい挙動）
const ttsRes = await fetch(`${BASE_URL}/api/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: '大動脈の壁が裂けています。' }),
});
if (ttsRes.status === 200) {
  const buffer = Buffer.from(await ttsRes.arrayBuffer());
  check('tts returns playable WAV audio', ttsRes.headers.get('content-type') === 'audio/wav' && buffer.subarray(0, 4).toString('ascii') === 'RIFF', `bytes=${buffer.length}`);
} else {
  check('tts degrades cleanly without live credentials (503)', ttsRes.status === 503, `status=${ttsRes.status}`);
}

if (failures > 0) {
  console.error(`smoke-e2e: ${failures} failure(s)`);
  process.exit(1);
}
console.log('smoke-e2e: all checks passed');
