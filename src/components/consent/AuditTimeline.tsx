const DEFAULT_EVENTS = [
  'explanation_generated',
  'family_response',
  'understanding_evaluated',
  'qa_answered',
  'physician_reviewed',
  'export_created',
];

export function AuditTimeline({ events = DEFAULT_EVENTS }: { events?: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">Realtime audit stream</p>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        {events.map((event, index) => (
          <li key={event} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span>
            <span className="font-mono">{event}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-red-700">署名済み同意ではない / 医師レビュー必須 / 選択済み根拠のみ</p>
    </div>
  );
}
