"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface QAResult {
  answer: string;
  safetyLabel: string;
  requiresDoctorReview: boolean;
  evidenceReferences?: string[];
}

type UnderstandingQuestion = {
  id: string;
  question: string;
  options: string[];
};

type SessionView = {
  sessionId: string;
  diagnosis: string;
  plannedSurgery: string;
  understandingQuestions: UnderstandingQuestion[];
};

type ConsentDecisionResult = {
  decision: "consent_ready" | "needs_physician_followup";
  reasons: string[];
  unresolvedQuestions: string[];
};

const SAFETY_LABEL_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "一般説明", color: "bg-green-100 text-green-800" },
  "doctor-review": { label: "医師確認が必要", color: "bg-red-100 text-red-800" },
  "individual-prognosis": { label: "個別予後は断定不可", color: "bg-orange-100 text-orange-800" },
  "consent-guidance": { label: "同意誘導禁止", color: "bg-purple-100 text-purple-800" },
  "facility-template": { label: "施設標準回答", color: "bg-sky-100 text-sky-800" },
};

const QUICK_QUESTIONS = [
  "なぜ今すぐ手術が必要なのですか？",
  "脳梗塞のリスクについて教えてください。",
  "出血や輸血の可能性はありますか？",
  "手術しない場合はどうなりますか？",
];

const NO_ANSWER_FALLBACK =
  "選択済み参考資料内には、この質問に直接答えられる記載が見つかりません。担当医に確認する質問として記録します。";

const INTENT_OPTIONS = [
  { value: "agrees", label: "説明を理解し、手術に同意します", color: "border-green-500 bg-green-50 text-green-900" },
  { value: "undecided", label: "迷っているので、医師と話したい", color: "border-amber-500 bg-amber-50 text-amber-900" },
  { value: "declines", label: "現時点では同意しません", color: "border-red-500 bg-red-50 text-red-900" },
] as const;

type IntentValue = (typeof INTENT_OPTIONS)[number]["value"];

export default function QAPage() {
  const params = useParams();
  const sessionId = params.caseId as string;

  const [view, setView] = useState<SessionView | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found">("loading");
  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<QAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [concerns, setConcerns] = useState("");
  const [intent, setIntent] = useState<IntentValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<ConsentDecisionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoadState("not-found");
          return;
        }
        setView((await res.json()) as SessionView);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("not-found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const askQuestion = async (question: string) => {
    const asked = question.trim();
    if (!asked) return;
    setFreeQuestion(asked);
    setLoading(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: asked,
          diagnosis: view?.diagnosis ?? "",
          plannedSurgery: view?.plannedSurgery ?? "",
          sessionId,
        }),
      });

      if (res.ok) {
        setFreeAnswer((await res.json()) as QAResult);
      } else {
        throw new Error("API error");
      }
    } catch {
      setFreeAnswer({
        answer: NO_ANSWER_FALLBACK,
        safetyLabel: "doctor-review",
        requiresDoctorReview: true,
        evidenceReferences: [],
      });
    }
    setLoading(false);
  };

  const selectAnswer = (qId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  };

  const questions = view?.understandingQuestions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);
  const canSubmit = allAnswered && intent !== null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !intent) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] })),
          concerns,
          intent,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data = (await res.json()) as { decision: ConsentDecisionResult };
      setDecision(data.decision);
    } catch {
      setDecision({
        decision: "needs_physician_followup",
        reasons: ["送信時にエラーが発生したため、担当医師が直接確認します"],
        unresolvedQuestions: [],
      });
    }
    setSubmitting(false);
  };

  if (loadState === "not-found") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Card className="max-w-lg mx-auto mt-10 border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm font-bold text-amber-900">セッションが見つかりません</p>
            <p className="text-xs text-amber-800">担当医師から案内されたリンクからアクセスしてください。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (decision) {
    const ready = decision.decision === "consent_ready";
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto mt-10 space-y-3">
          <Card className={ready ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-3xl">{ready ? "✅" : "🧑‍⚕️"}</p>
              <p className="text-base font-bold">
                {ready
                  ? "ご回答ありがとうございました"
                  : "担当医師が直接ご説明します"}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {ready
                  ? "ご理解の確認と同意のご意思を記録し、担当医師に引き継ぎました。医師が最終確認のうえ、手続きを進めます。"
                  : "いただいたご回答・ご質問は担当医師に届いています。医師が確認のうえ、直接お話しします。"}
              </p>
              {!ready && decision.reasons.length > 0 && (
                <div className="text-left bg-white rounded-lg border border-amber-200 p-3">
                  <p className="text-xs font-bold text-amber-900 mb-1">医師にお伝えする内容:</p>
                  {decision.reasons.map((reason, i) => (
                    <p key={i} className="text-xs text-amber-800">・{reason}</p>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                この記録は署名済み同意書ではありません。最終確認は担当医師が行います。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">質問 & 確認</h1>
        <p className="text-xs text-gray-500">
          ※ 回答は担当医師が選択した資料の範囲に限定されます
        </p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">
        {/* 質問 */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">❓ よくある家族の質問</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                onClick={() => askQuestion(question)}
                disabled={loading || loadState !== "ready"}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 自由質問 */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">✏️ 自由に質問する</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            <Textarea
              placeholder="気になることを入力してください..."
              value={freeQuestion}
              onChange={(e) => setFreeQuestion(e.target.value)}
              rows={2}
            />
            <Button
              onClick={() => askQuestion(freeQuestion)}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!freeQuestion.trim() || loading || loadState !== "ready"}
            >
              {loading ? "⏳ 選択済み資料を確認中..." : "質問する"}
            </Button>
            {freeAnswer && (
              <div className={`border rounded-lg p-3 space-y-2 ${freeAnswer.requiresDoctorReview ? "bg-blue-50 border-blue-200" : "bg-sky-50 border-sky-100"}`}>
                <p className="text-sm text-blue-900 whitespace-pre-line">{freeAnswer.answer}</p>
                <div className="flex flex-wrap gap-1">
                  {(freeAnswer.evidenceReferences ?? []).map((ref) => (
                    <Badge key={ref} variant="outline" className="text-[10px] border-blue-300 text-blue-800">
                      参照: {ref}
                    </Badge>
                  ))}
                  {freeAnswer.safetyLabel && freeAnswer.safetyLabel !== "general" && (
                    <Badge className={`text-xs ${SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.color || "bg-gray-100 text-gray-800"}`}>
                      {SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.label || freeAnswer.safetyLabel}
                    </Badge>
                  )}
                </div>
                {freeAnswer.requiresDoctorReview && (
                  <Badge className="bg-red-600 text-white text-xs">
                    🔴 担当医が直接説明します（質問は記録されました）
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* 理解度チェック */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">📝 理解度チェック</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-4">
            {loadState === "loading" && (
              <p className="text-sm text-gray-500 text-center py-4">⏳ 読み込み中...</p>
            )}
            {questions.map((q, qIdx) => (
              <div key={q.id} className="space-y-1.5">
                <p className="text-sm font-medium">
                  Q{qIdx + 1}: {q.question}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt, optIdx) => {
                    const selected = answers[q.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => selectAnswer(q.id, optIdx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                          selected
                            ? "bg-blue-100 border-blue-500 text-blue-800"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 不安 */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">😰 不安・医師に確認したいこと</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Textarea
              placeholder="不安なこと、医師に直接確認したいことを自由に書いてください..."
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={2}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              記入された内容はそのまま担当医師に届きます。
            </p>
          </CardContent>
        </Card>

        {/* 同意意思 */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">🤝 現時点でのお気持ち</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {INTENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setIntent(option.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border-2 transition-colors ${
                  intent === option.value ? option.color : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
            <p className="text-[11px] text-gray-500 pt-1">
              ここでの回答は最終決定ではありません。医師が最終確認を行います。
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-base py-5"
          size="lg"
          disabled={!canSubmit}
        >
          {submitting ? "⏳ 送信中..." : "📤 回答を送信"}
        </Button>
        {!allAnswered && loadState === "ready" && (
          <p className="text-center text-xs text-gray-500">
            全ての理解度チェックに回答してください
          </p>
        )}
        {allAnswered && intent === null && (
          <p className="text-center text-xs text-gray-500">
            現時点でのお気持ちを選択してください
          </p>
        )}
      </div>
    </div>
  );
}
