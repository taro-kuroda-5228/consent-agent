import {
  buildAorticDissectionCheckpoints,
  buildPhysicianSummary,
  evaluateFamilyResponse,
  type ConsentIntentRecord,
} from '@/lib/ai-consent-session';

const demoCheckpoints = buildAorticDissectionCheckpoints();
const demoEvaluations = [
  evaluateFamilyResponse(
    demoCheckpoints[0],
    '大動脈が裂けて破裂の危険があり、緊急手術が必要だと理解しました。',
  ),
  evaluateFamilyResponse(
    demoCheckpoints[1],
    '少し分かりません。父が必ず助かるのか、他の方法がないか医師に聞きたいです。',
  ),
  evaluateFamilyResponse(
    demoCheckpoints[2],
    '人工血管の手術で、出血や脳梗塞のリスクがあると聞きました。',
  ),
];
const demoIntent: ConsentIntentRecord = {
  statedIntent: 'undecided',
  confidence: 'low',
  freeTextSummary: '家族は緊急性を理解しつつ、個別の見通しを医師に確認してから最終判断したい。',
  questionsForPhysician: ['この患者の場合の助かる可能性', '脳梗塞や腎不全が起きた場合の対応', '手術以外の選択肢の有無'],
};
const physicianSummary = buildPhysicianSummary(demoEvaluations, demoIntent);

const blockedArtifacts = [
  {
    service: 'gmail',
    blockedAction: 'GMAIL.SEND',
    title: '家族への説明完了メール',
    action: '医師レビュー完了までは下書き保持。AI単独では送信しません。',
    mode: 'draft-only',
    approvalGate: { requiredReviewerRoles: ['attending_physician'] },
  },
  {
    service: 'calendar',
    blockedAction: 'CALENDAR.INVITE',
    title: '追加説明・同意確認予定',
    action: '医師が必要と判断した場合のみ予定作成。AI単独では招待しません。',
    mode: 'blocked-until-approved',
    approvalGate: { requiredReviewerRoles: ['attending_physician'] },
  },
  {
    service: 'drive',
    blockedAction: 'DRIVE.SHARE',
    title: '同意説明記録の共有',
    action: '匿名デモ記録のみ表示。実患者資料の外部共有は医師承認と院内規程が必要です。',
    mode: 'blocked-until-approved',
    approvalGate: { requiredReviewerRoles: ['attending_physician'] },
  },
];

const safetyControls = [
  'AI説明レコードは署名済み同意ではなく、医師最終確認前の支援記録として扱う',
  '患者名、MRN、メールアドレスなどのPHIはConsent record JSONへ保存しない',
  '個別予後、生存可能性、治療選択の最終判断は必ず医師にエスカレーションする',
  'Gmail / Calendar / Drive などの外部副作用はHuman approval gateでブロックする',
];

export default function ApprovalsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">医師サマリー・承認ゲート</h1>
      <p className="mt-2 text-slate-600">
        AI説明セッションの理解不足・不安・同意意思・医師質問だけを集約します。
        この記録は署名済み同意ではなく、医師最終確認前の同意説明支援レコードです。
      </p>

      <section className="mt-10 rounded-xl border border-blue-100 bg-white p-6">
        <p className="text-sm font-semibold text-blue-700">Physician consent summary</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">医師が今見るべき疑問点</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryTile label="説明済み" value={`${physicianSummary.explainedCheckpointIds.length} checkpoints`} />
          <SummaryTile label="理解不足" value={`${physicianSummary.understandingGaps.length} items`} />
          <SummaryTile label="同意意思" value={`${physicianSummary.familyIntent.statedIntent} / ${physicianSummary.familyIntent.confidence}`} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <h3 className="font-semibold text-slate-900">理解不足・再説明候補</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {physicianSummary.understandingGaps.map(gap => (
                <li key={gap.checkpointId}>
                  <span className="font-medium">{gap.title}</span>: {gap.missingConcepts.join(', ') || 'red flagあり'} / {gap.recommendedNextAction}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <h3 className="font-semibold text-slate-900">AIが回答すべきでない/医師判断が必要な項目</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {physicianSummary.physicianOnlyItems.map(item => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">家族の同意意思・医師への質問</h3>
          <p className="mt-2 text-sm text-slate-700">{physicianSummary.familyIntent.freeTextSummary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {physicianSummary.questionsForPhysician.map(question => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold text-red-700">{physicianSummary.notSignedConsentNotice}</p>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-red-100 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">Human approval gate</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">医師レビュー完了まで外部副作用は実行しない</h2>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {blockedArtifacts.map(artifact => (
            <article key={artifact.service} className="rounded-lg bg-white border border-red-100 p-4">
              <div className="text-xs uppercase tracking-wide text-red-600 font-semibold">{artifact.blockedAction}</div>
              <h3 className="mt-1 font-semibold text-slate-900">{artifact.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{artifact.action}</p>
              <p className="mt-3 text-xs text-slate-500">
                必須承認者: {artifact.approvalGate.requiredReviewerRoles.join(', ')} / mode: {artifact.mode}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">安全制御</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {safetyControls.map(control => (
            <li key={control} className="flex gap-2">
              <span className="text-blue-600">✓</span>
              <span>{control}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}
