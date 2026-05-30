'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  buildAorticDissectionCheckpoints,
  buildConsentExplanationRecord,
  buildPhysicianSummary,
  evaluateFamilyResponse,
  type ConsentIntentRecord,
  type FamilyResponseEvaluation,
} from '@/lib/ai-consent-session';
import { demoConsentCase } from '@/lib/omni-demo-consent-case';
import { getMockOmniExplanation } from '@/lib/gemini-omni-adapter';

const DEMO_RESPONSES = {
  clear: '大動脈が裂けて破裂の危険があり、命に関わるので緊急手術が必要です。人工血管で治療し、出血や脳梗塞も確認します。',
  partial: '急いで手術が必要そうですが、詳しい理由は少し分かりません。',
  unsafe: '怖いです。父は必ず助かりますか。後遺症や死ぬ可能性、他の方法がないか医師に直接聞きたいです。',
} as const;

type DemoResponseKind = keyof typeof DEMO_RESPONSES;

type IntentKind = ConsentIntentRecord['statedIntent'];

const INTENT_COPY: Record<IntentKind, ConsentIntentRecord> = {
  agrees: {
    statedIntent: 'agrees',
    confidence: 'medium',
    freeTextSummary: '家族は説明内容を概ね理解し、医師の最終確認後に同意方向で考えている。',
    questionsForPhysician: ['脳梗塞と腎不全のリスクをもう一度確認したい'],
  },
  undecided: {
    statedIntent: 'undecided',
    confidence: 'low',
    freeTextSummary: '家族は不安が残っており、個別の見通しを医師から聞いてから決めたい。',
    questionsForPhysician: ['この患者の場合の助かる可能性を確認したい', '手術しない場合の経過を確認したい'],
  },
  declines: {
    statedIntent: 'declines',
    confidence: 'low',
    freeTextSummary: '家族は現時点では拒否寄りだが、緊急性と代替案を医師に再確認したい。',
    questionsForPhysician: ['手術以外の選択肢が本当にないのか確認したい'],
  },
};

export function OmniConsentSessionDemo() {
  const checkpoints = useMemo(() => buildAorticDissectionCheckpoints(), []);
  const [activeCheckpointId, setActiveCheckpointId] = useState(checkpoints[0]?.id ?? 'disease-mechanism');
  const [responseKindByCheckpoint, setResponseKindByCheckpoint] = useState<Record<string, DemoResponseKind>>({
    'disease-mechanism': 'clear',
  });
  const [intentKind, setIntentKind] = useState<IntentKind>('undecided');

  const activeCheckpoint = checkpoints.find(checkpoint => checkpoint.id === activeCheckpointId) ?? checkpoints[0];
  const explanation = getMockOmniExplanation({
    caseId: demoConsentCase.caseId,
    checkpointId: activeCheckpoint.id,
    audience: 'patient_family',
    language: 'ja',
  });
  const evaluations: FamilyResponseEvaluation[] = checkpoints
    .filter(checkpoint => responseKindByCheckpoint[checkpoint.id])
    .map(checkpoint => evaluateFamilyResponse(checkpoint, DEMO_RESPONSES[responseKindByCheckpoint[checkpoint.id]]));
  const currentEvaluation = responseKindByCheckpoint[activeCheckpoint.id]
    ? evaluateFamilyResponse(activeCheckpoint, DEMO_RESPONSES[responseKindByCheckpoint[activeCheckpoint.id]])
    : null;
  const intent = INTENT_COPY[intentKind];
  const physicianSummary = buildPhysicianSummary(evaluations, intent);
  const consentRecord = buildConsentExplanationRecord({
    evaluations,
    intent,
    modelMode: explanation.mode,
    generatedAt: '2026-05-30T00:00:00.000Z',
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-700">匿名デモ症例</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoTile label="疾患" value={demoConsentCase.condition} />
          <InfoTile label="予定手術" value={demoConsentCase.procedure} />
          <InfoTile label="緊急度" value={demoConsentCase.urgency} />
          <InfoTile label="患者表示" value={demoConsentCase.patientDisplay} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">説明チェックポイント</h2>
          <div className="mt-4 space-y-3">
            {checkpoints.map(checkpoint => (
              <button
                key={checkpoint.id}
                type="button"
                onClick={() => setActiveCheckpointId(checkpoint.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  checkpoint.id === activeCheckpoint.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-brand-200'
                }`}
              >
                <div className="font-semibold text-slate-900">{checkpoint.title}</div>
                <div className="mt-1 text-xs text-slate-500">{checkpoint.checkQuestion}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand-700">Gemini Omni 説明パネル</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
              mode: {explanation.mode}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{activeCheckpoint.title}</h2>
          <div className="mt-4 rounded-xl bg-white p-4 text-slate-700 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">音声説明風テキスト</p>
            <p className="mt-2 leading-relaxed">{explanation.spokenText}</p>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">図解キュー</p>
            <p className="mt-2 text-slate-700">{explanation.visualCue}</p>
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{explanation.safetyNote}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">理解確認</h2>
        <p className="mt-2 text-sm text-slate-600">{explanation.followUpPrompt}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DemoResponseButton kind="clear" label="理解良好" onSelect={kind => setResponseKindByCheckpoint(current => ({ ...current, [activeCheckpoint.id]: kind }))} />
          <DemoResponseButton kind="partial" label="少し曖昧" onSelect={kind => setResponseKindByCheckpoint(current => ({ ...current, [activeCheckpoint.id]: kind }))} />
          <DemoResponseButton kind="unsafe" label="不安・医師に質問あり" onSelect={kind => setResponseKindByCheckpoint(current => ({ ...current, [activeCheckpoint.id]: kind }))} />
        </div>
        {currentEvaluation ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="ai-evaluation-result">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass(currentEvaluation.level)}`}>
                {currentEvaluation.level}
              </span>
              <span className="text-sm font-medium text-slate-700">next action: {currentEvaluation.recommendedNextAction}</span>
              <span className="text-sm text-slate-500">score: {currentEvaluation.score}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">デモ回答: {currentEvaluation.evidence.sanitizedResponse}</p>
            {currentEvaluation.missingConcepts.length > 0 ? (
              <p className="mt-2 text-sm text-amber-700">不足概念: {currentEvaluation.missingConcepts.join(', ')}</p>
            ) : null}
            {currentEvaluation.redFlags.length > 0 ? (
              <p className="mt-2 text-sm text-red-700">医師確認フラグ: {currentEvaluation.redFlags.join(', ')}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">同意意思確認</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(['agrees', 'undecided', 'declines'] as const).map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => setIntentKind(kind)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                  intentKind === kind ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700'
                }`}
              >
                {kind === 'agrees' ? '同意方向' : kind === 'undecided' ? '保留' : '拒否'}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-700">{intent.freeTextSummary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {intent.questionsForPhysician.map(question => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-700">医師サマリー導線</p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">医師が今見るべき項目だけを集約</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>説明済み: {physicianSummary.explainedCheckpointIds.length} checkpoint</li>
            <li>理解不足: {physicianSummary.understandingGaps.length} checkpoint</li>
            <li>red flags: {physicianSummary.redFlags.length || 0}</li>
            <li>外部送信ブロック: {physicianSummary.externalActionsBlocked.join(', ')}</li>
          </ul>
          <Link href="/approvals" className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            医師サマリーを見る →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Consent record JSON</h2>
          <span className="text-xs text-slate-300">匿名・監査用 / 署名済み同意ではない</span>
        </div>
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-black/40 p-4 text-xs leading-relaxed">
          {JSON.stringify(consentRecord, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DemoResponseButton({
  kind,
  label,
  onSelect,
}: {
  kind: DemoResponseKind;
  label: string;
  onSelect: (kind: DemoResponseKind) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(kind)}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50"
    >
      <span>{label}</span>
      <span className="mt-2 block text-xs font-normal text-slate-500">{DEMO_RESPONSES[kind]}</span>
    </button>
  );
}

function badgeClass(level: FamilyResponseEvaluation['level']): string {
  if (level === 'clear') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (level === 'partial') {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-red-100 text-red-700';
}
