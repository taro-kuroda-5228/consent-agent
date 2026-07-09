"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type ConsentDecisionResult = {
  decision: "consent_ready" | "needs_physician_followup";
  reasons: string[];
  unresolvedQuestions: string[];
};

type DoctorSummaryView = {
  sessionId: string;
  status: string;
  diagnosis: string;
  plannedSurgery: string;
  modelMode: string;
  understood: string[];
  notUnderstood: string[];
  concerns: string[];
  doctorQuestions: string[];
  qaLog: Array<{ question: string; answer: string; safetyLabel: string; escalated: boolean }>;
  understandingScore: { correct: number; total: number };
  intent: { statedIntent: "agrees" | "undecided" | "declines" } | null;
  consentDecision: ConsentDecisionResult | null;
  suggestedScript: string[];
  anxietyLevel: "low" | "medium" | "high";
  selectedEvidenceIds: string[];
  reviews: Array<{ reviewStatus: string; physicianNotes?: string; createdAt: string }>;
  notSignedConsentNotice: string;
};

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  agrees: { label: "同意の意思あり", color: "bg-green-100 text-green-800" },
  undecided: { label: "迷っている", color: "bg-amber-100 text-amber-800" },
  declines: { label: "同意しない", color: "bg-red-100 text-red-800" },
};

const ANXIETY_LABELS: Record<string, string> = {
  low: "落ち着いている",
  medium: "やや不安あり",
  high: "強い不安あり",
};

const MOBILE_SAFE_BADGE_CLASS =
  "h-auto max-w-full justify-start whitespace-normal text-left leading-relaxed sm:whitespace-nowrap";

export default function DoctorSummary() {
  const params = useParams();
  const sessionId = params.caseId as string;

  const [view, setView] = useState<DoctorSummaryView | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found">("loading");
  const [reviewing, setReviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/summary`);
        if (cancelled) return;
        if (!res.ok) {
          setLoadState("not-found");
          return;
        }
        setView((await res.json()) as DoctorSummaryView);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("not-found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  // 家族の回答・質問を待つ間、5秒間隔でサマリーを再取得する（Realtime購読のフォールバック設計）。
  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((key) => key + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const submitReview = async (reviewStatus: "ready_for_consent_discussion" | "needs_followup") => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!res.ok) throw new Error("review failed");
      toast.success(
        reviewStatus === "ready_for_consent_discussion"
          ? "レビュー完了: 同意確認へ進める状態として記録しました"
          : "レビュー完了: 追加説明が必要として記録しました",
      );
      setRefreshKey((key) => key + 1);
    } catch {
      toast.error("レビューの記録に失敗しました");
    }
    setReviewing(false);
  };

  const downloadExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/export`);
      if (!res.ok) throw new Error("export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `consent-explanation-record-${sessionId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("説明支援記録（匿名JSON）をダウンロードしました");
    } catch {
      toast.error("記録のエクスポートに失敗しました");
    }
    setExporting(false);
  };

  if (loadState === "not-found") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Card className="max-w-lg mx-auto mt-10 border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm font-bold text-amber-900">セッションが見つかりません</p>
            <p className="text-xs text-amber-800">医師コンソールで説明セッションを開始すると、このページにサマリーが表示されます。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === "loading" || !view) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Card className="max-w-lg mx-auto mt-10">
          <CardContent className="py-10 text-center text-sm text-gray-500">⏳ サマリーを生成中...</CardContent>
        </Card>
      </div>
    );
  }

  const decision = view.consentDecision;
  const reviewed = view.reviews.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-5 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">説明同意エージェント</h1>
        <p className="text-xs text-gray-500">医師向け引き継ぎサマリー / セッション: {view.sessionId}</p>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-bold">医師用サマリー</h2>
            <p className="break-words text-xs leading-relaxed text-gray-500">
              {view.diagnosis} / {view.plannedSurgery}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge className={`bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-3 py-1 ${MOBILE_SAFE_BADGE_CLASS}`}>
              🟢 ライブ更新中（5秒間隔）
            </Badge>
            <Badge className={`bg-red-100 text-red-800 border-red-200 text-xs px-3 py-1 ${MOBILE_SAFE_BADGE_CLASS}`}>
              🔴 医師確認：必須
            </Badge>
          </div>
        </div>

        {/* AI判定 */}
        {decision ? (
          <Card className={decision.decision === "consent_ready" ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50"}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center" data-testid="doctor-summary-decision-title">
                <span className="break-words leading-relaxed">
                  {decision.decision === "consent_ready" ? "✅ AI判定: 同意確認へ進められる状態" : "🧑‍⚕️ AI判定: 医師フォローアップが必要"}
                </span>
                {view.intent && (
                  <Badge className={`text-xs ${INTENT_LABELS[view.intent.statedIntent]?.color} ${MOBILE_SAFE_BADGE_CLASS}`}>
                    家族: {INTENT_LABELS[view.intent.statedIntent]?.label}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-xs ${MOBILE_SAFE_BADGE_CLASS}`}>
                  不安レベル: {ANXIETY_LABELS[view.anxietyLevel]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1">
              {decision.decision === "consent_ready" ? (
                <p className="text-sm text-green-900">
                  理解確認は全問クリア、未解決の質問なし、同意の意思が記録されています。最終確認と署名手続きへ進めます。
                </p>
              ) : (
                <>
                  <p className="text-xs font-bold text-amber-900">医師が対応すべき論点（これ以外の説明は完了済み）:</p>
                  {decision.reasons.map((reason, i) => (
                    <p key={i} className="text-sm text-amber-900">・{reason}</p>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-300 bg-slate-100">
            <CardContent className="py-4 text-sm text-slate-600 text-center">
              家族の理解確認・同意意思はまだ送信されていません。
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-green-800">✅ 理解済み</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {view.understood.length === 0 && <p className="text-sm text-gray-400">（まだありません）</p>}
              {view.understood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">✅ {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-yellow-800">⚠️ 再説明が必要</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {view.notUnderstood.length === 0 && <p className="text-sm text-gray-400">（なし）</p>}
              {view.notUnderstood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">⚠️ {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-orange-800">😰 家族の不安・自由記述</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {view.concerns.length === 0 && <p className="text-sm text-gray-400">（なし）</p>}
              {view.concerns.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">😰 {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-red-800">🔴 医師が直接答えるべき質問</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {view.doctorQuestions.length === 0 && <p className="text-sm text-gray-400">（なし）</p>}
              {view.doctorQuestions.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">🔴 {item}</p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 推奨スクリプト */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">🗣️ 医師向け: 補足説明のポイント</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-0.5">
            {view.suggestedScript.map((line, i) => (
              <p key={i} className="text-sm text-gray-700">・{line}</p>
            ))}
          </CardContent>
        </Card>

        {/* Q&Aログ */}
        {view.qaLog.length > 0 && (
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm">💬 家族からの質問ログ（{view.qaLog.length}件）</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {view.qaLog.map((entry, i) => (
                <div key={i} className="border rounded-lg p-2.5">
                  <p className="break-words text-sm font-medium leading-relaxed">Q: {entry.question}</p>
                  <p className="mt-1 break-words text-sm leading-relaxed text-gray-600">A: {entry.answer}</p>
                  {entry.escalated && (
                    <Badge className={`mt-1 bg-red-100 text-red-800 text-[10px] ${MOBILE_SAFE_BADGE_CLASS}`}>選択済み根拠で回答不可 → 医師対応</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* レビュー & 記録 */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">📋 医師レビューと記録</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">理解度スコア</p>
                <p className="text-sm font-bold text-blue-600">
                  {view.understandingScore.correct}/{view.understandingScore.total}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">使用根拠</p>
                <p className="text-sm font-bold text-gray-700">{view.selectedEvidenceIds.length}件</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">セッション状態</p>
                <p className="text-sm font-bold text-gray-700">{view.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">医師レビュー</p>
                <p className={`text-sm font-bold ${reviewed ? "text-green-600" : "text-red-600"}`}>
                  {reviewed ? "記録済み ✅" : "未実施"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => submitReview("needs_followup")}
                variant="outline"
                className="flex-1"
                disabled={reviewing}
              >
                🧑‍⚕️ 追加説明が必要
              </Button>
              <Button
                onClick={() => submitReview("ready_for_consent_discussion")}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={reviewing}
              >
                ✅ 同意確認へ進める
              </Button>
            </div>

            <Separator />

            <Button
              onClick={downloadExport}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={exporting}
              size="lg"
            >
              {exporting ? "⏳ 生成中..." : "📝 説明支援記録をエクスポート（匿名JSON）"}
            </Button>
            <p className="text-[11px] text-gray-500 text-center">{view.notSignedConsentNotice}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
