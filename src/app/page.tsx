"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import demoCase from "@/data/demo-case.json";
import type { ReactNode } from "react";

// ---- Types ----
interface ExplanationCard {
  id: string;
  icon: string;
  title: string;
  content: string;
}

interface QAResult {
  answer: string;
  safetyLabel: string;
  requiresDoctorReview: boolean;
}

const SAFETY_LABEL_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "一般説明", color: "bg-green-100 text-green-800" },
  "doctor-review": { label: "医師確認が必要", color: "bg-red-100 text-red-800" },
  "individual-prognosis": { label: "個別予後は断定不可", color: "bg-orange-100 text-orange-800" },
  "consent-guidance": { label: "同意誘導禁止", color: "bg-purple-100 text-purple-800" },
};

const FAQ = [
  { question: "手術しないとどうなりますか？", answer: "放置すると大動脈が破裂し、命に関わる可能性があります。詳細は担当医が説明します。", requiresDoctorReview: false },
  { question: "成功率はどれくらいですか？", answer: "個別の成功率は患者さんの状態によって異なるため、担当医が直接ご説明します。", requiresDoctorReview: true },
  { question: "後遺症は残りますか？", answer: "脳梗塞や腎不全などの合併症の可能性があります。個別の見通しは担当医にお尋ねください。", requiresDoctorReview: true },
];

const UNDERSTANDING_QUESTIONS = [
  { id: "q1", question: "今回の病気はどの血管に起きていますか？", options: ["肺動脈", "大動脈", "冠動脈", "腎動脈"], correctIndex: 1 },
  { id: "q2", question: "なぜ緊急手術が必要ですか？", options: ["痛みが強いから", "血管が破裂する危険があるから", "感染するから", "薬が効かないから"], correctIndex: 1 },
  { id: "q3", question: "手術の主なリスクは何ですか？", options: ["出血・脳梗塞など", "傷が残る", "入院が長い", "痛い"], correctIndex: 0 },
  { id: "q4", question: "最終的な判断は誰がしますか？", options: ["AI", "家族", "担当医師", "看護師"], correctIndex: 2 },
];

type Step = 1 | 2 | 3 | 4;

// ---- Main Component ----
export default function ConsentAgent() {
  const [step, setStep] = useState<Step>(1);

  // Screen 1 state
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [urgency, setUrgency] = useState("");
  const [plannedSurgery, setPlannedSurgery] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cardiopulmonaryBypass, setCardiopulmonaryBypass] = useState(false);
  const [transfusion, setTransfusion] = useState("");
  const [risks, setRisks] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading1, setLoading1] = useState(false);

  // Screen 2 state
  const [explanation, setExplanation] = useState<ExplanationCard[]>([]);
  const [aiSource, setAiSource] = useState<"idle" | "gemini" | "fallback">("idle");
  const [evidenceReady, setEvidenceReady] = useState(false);

  // Screen 3 state
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<QAResult | null>(null);
  const [loading3, setLoading3] = useState(false);
  const [qaLog, setQaLog] = useState<{ question: string; answer: string; safetyLabel: string }[]>([]);
  const [understandingAnswers, setUnderstandingAnswers] = useState<Record<string, number>>({});
  const [concerns, setConcerns] = useState("");

  // Screen 4 state
  const [summary, setSummary] = useState<{
    understood: string[];
    notUnderstood: string[];
    concerns: string[];
    doctorQuestions: string[];
  } | null>(null);
  const [consentSent, setConsentSent] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const AVAILABLE_RISKS = ["死亡", "脳梗塞", "出血", "腎不全", "再手術", "感染", "麻痺", "心不全"];

  // ---- Handlers ----
  const loadDemo = () => {
    setAge(String(demoCase.age));
    setSex(demoCase.sex);
    setDiagnosis(demoCase.diagnosis);
    setUrgency(demoCase.urgency);
    setPlannedSurgery(demoCase.plannedSurgery);
    setPurpose(demoCase.purpose);
    setCardiopulmonaryBypass(demoCase.cardiopulmonaryBypass);
    setTransfusion(demoCase.transfusion);
    setRisks(demoCase.risks);
    setNotes(demoCase.notes);
  };

  const toggleRisk = (risk: string) => {
    setRisks((prev) => prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]);
  };

  const startExplanation = async () => {
    setLoading1(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis, plannedSurgery, risks, urgency, purpose, cardiopulmonaryBypass, transfusion, notes }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
        setAiSource("gemini");
        setEvidenceReady(true);
      } else {
        throw new Error("API error");
      }
    } catch {
      const { default: mock } = await import("@/data/mock-explanation.json");
      setExplanation(mock);
      setAiSource("fallback");
      setEvidenceReady(false);
    }
    setLoading1(false);
    setStep(2);
  };

  const handleFreeQuestion = async () => {
    if (!freeQuestion.trim()) return;
    setLoading3(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: freeQuestion, diagnosis, plannedSurgery, risks }),
      });
      if (res.ok) {
        const data = await res.json();
        setFreeAnswer(data);
        setQaLog((prev) => [...prev, { question: freeQuestion, answer: data.answer, safetyLabel: data.safetyLabel }]);
      } else {
        throw new Error("API error");
      }
    } catch {
      const fallback = { answer: "ご質問ありがとうございます。こちらの内容は担当医師が直接ご説明いたします。", safetyLabel: "doctor-review", requiresDoctorReview: true };
      setFreeAnswer(fallback);
      setQaLog((prev) => [...prev, { question: freeQuestion, answer: fallback.answer, safetyLabel: fallback.safetyLabel }]);
    }
    setLoading3(false);
  };

  const selectUnderstanding = (qId: string, optIdx: number) => {
    setUnderstandingAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const allAnswered = UNDERSTANDING_QUESTIONS.every((q) => understandingAnswers[q.id] !== undefined);

  const submitToDoctor = async () => {
    // Build summary from collected data
    const correctAnswers = UNDERSTANDING_QUESTIONS.filter((q) => understandingAnswers[q.id] === q.correctIndex);
    const wrongAnswers = UNDERSTANDING_QUESTIONS.filter((q) => understandingAnswers[q.id] !== q.correctIndex);
    
    setSummary({
      understood: correctAnswers.map((q) => q.question),
      notUnderstood: wrongAnswers.map((q) => q.question),
      concerns: concerns ? [concerns] : [],
      doctorQuestions: qaLog.filter((q) => q.safetyLabel === "doctor-review" || q.safetyLabel === "individual-prognosis").map((q) => q.question),
    });
    setStep(4);
  };

  // ---- Render Helpers ----
  const stepLabels = ["医師入力", "家族説明", "理解確認", "医師サマリー"];

  // ---- Screen Renderers ----
  const renderScreen1 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-lg font-bold">医師入力</h2>
        <p className="text-xs text-gray-500">個人情報を含まないデモ症例です。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">年齢</Label>
          <Input type="number" placeholder="62" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">性別</Label>
          <Input placeholder="男性" value={sex} onChange={(e) => setSex(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">診断</Label>
        <Input placeholder="Stanford A型急性大動脈解離" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">緊急度</Label>
        <Input placeholder="ただちに緊急手術が必要" value={urgency} onChange={(e) => setUrgency(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">予定手術</Label>
        <Input placeholder="緊急上行大動脈人工血管置換術 ± ヘミアーチ置換術" value={plannedSurgery} onChange={(e) => setPlannedSurgery(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">主なリスク</Label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_RISKS.map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => toggleRisk(risk)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                risks.includes(risk) ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">説明上の注意</Label>
        <Textarea placeholder="ご家族の不安が強いため、短く平易な説明を優先する。" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button onClick={loadDemo} variant="outline" className="w-full">デモ症例を読み込む</Button>
        <Button onClick={startExplanation} className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading1 || !diagnosis}>
          {loading1 ? "⏳ Gemini生成中..." : "家族説明を開始"}
        </Button>
      </div>
    </div>
  );

  const renderScreen2 = () => (
    <div className="space-y-3">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-lg font-bold">家族向けご説明</h2>
        <p className="text-xs text-gray-500">※ 担当医師の説明を補助するものです</p>
      </div>

      {aiSource === "gemini" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <p className="text-xs text-green-700">🤖 Gemini によるリアルタイム生成</p>
        </div>
      )}
      {aiSource === "fallback" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-600">📋 フォールバック（テンプレート）</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
        <p className="text-xs text-blue-700">
          📊 <strong>IRADレジストリ</strong>・<strong>JACC 2024ガイドライン</strong>に基づく情報
        </p>
      </div>

      {explanation.map((card, idx) => (
        <Card key={card.id} className="border-l-4 border-l-blue-400">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-medium">{card.icon} {card.title}</p>
            <p className="text-xs text-gray-700 mt-1 whitespace-pre-line leading-relaxed">{card.content}</p>
          </CardContent>
        </Card>
      ))}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
        <p className="text-xs text-amber-800">
          💡 <strong>ご注意:</strong> この説明は一般的な情報です。個別の状況については担当医師にお尋ねください。
        </p>
      </div>

      <Button onClick={() => setStep(3)} className="w-full bg-blue-600 hover:bg-blue-700 py-5">
        ❓ 質問・理解確認へ進む
      </Button>
    </div>
  );

  const renderScreen3 = () => (
    <div className="space-y-3">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-lg font-bold">質問 & 理解確認</h2>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">❓ よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-1.5">
          {FAQ.map((item, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
              >
                <span>Q: {item.question}</span>
                <span className="text-gray-400">{expandedFAQ === idx ? "▾" : "▸"}</span>
              </button>
              {expandedFAQ === idx && (
                <div className="px-3 pb-2 text-sm text-gray-700">
                  <Separator className="mb-1.5" />
                  <p>A: {item.answer}</p>
                  {item.requiresDoctorReview && (
                    <Badge className="mt-1.5 bg-red-600 text-white text-xs">🔴 担当医が直接説明します</Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Free Q&A */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">✏️ 自由に質問する {aiSource === "gemini" && <Badge className="ml-1 bg-green-600 text-white text-xs">Gemini</Badge>}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <Textarea placeholder="気になることを入力..." value={freeQuestion} onChange={(e) => setFreeQuestion(e.target.value)} rows={2} />
          <Button onClick={handleFreeQuestion} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!freeQuestion.trim() || loading3}>
            {loading3 ? "⏳ 回答生成中..." : "質問する"}
          </Button>
          {freeAnswer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 space-y-1.5">
              <p className="text-sm text-blue-800">{freeAnswer.answer}</p>
              <div className="flex gap-1.5">
                {freeAnswer.safetyLabel && (
                  <Badge className={`text-xs ${SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.color || "bg-gray-100"}`}>
                    {SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.label}
                  </Badge>
                )}
                {freeAnswer.requiresDoctorReview && (
                  <Badge className="bg-red-600 text-white text-xs">🔴 医師確認</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Understanding Check */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">📝 理解度チェック</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {UNDERSTANDING_QUESTIONS.map((q, qIdx) => (
            <div key={q.id} className="space-y-1">
              <p className="text-sm font-medium">Q{qIdx + 1}: {q.question}</p>
              <div className="space-y-1">
                {q.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => selectUnderstanding(q.id, optIdx)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      understandingAnswers[q.id] === optIdx
                        ? "bg-blue-100 border-blue-500 text-blue-800"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Concerns */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">😰 不安・確認したいこと</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea placeholder="不安なこと、確認したいこと..." value={concerns} onChange={(e) => setConcerns(e.target.value)} rows={2} />
        </CardContent>
      </Card>

      <Button
        onClick={submitToDoctor}
        className="w-full bg-green-600 hover:bg-green-700 py-5"
        disabled={!allAnswered}
      >
        📤 医師に回答を送信
      </Button>
      {!allAnswered && <p className="text-center text-xs text-gray-500">全ての理解度チェックに回答してください</p>}
    </div>
  );

  const renderScreen4 = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold">医師用サマリー</h2>
          <p className="text-xs text-gray-500">62歳男性 / Stanford A型</p>
        </div>
        <Badge className="bg-red-100 text-red-800 text-xs">🔴 医師確認：必須</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-green-800">✅ 理解済み</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 space-y-0.5">
            {summary?.understood.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">✅ {item}</p>
            ))}
            {(!summary || summary.understood.length === 0) && <p className="text-xs text-gray-400">なし</p>}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-yellow-800">⚠️ 未理解</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 space-y-0.5">
            {summary?.notUnderstood.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">⚠️ {item}</p>
            ))}
            {(!summary || summary.notUnderstood.length === 0) && <p className="text-xs text-gray-400">なし</p>}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-orange-800">😰 家族の不安</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 space-y-0.5">
            {summary?.concerns.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">😰 {item}</p>
            ))}
            {(!summary || summary.concerns.length === 0) && <p className="text-xs text-gray-400">なし</p>}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs text-red-800">🔴 医師が直接答えるべき質問</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 space-y-0.5">
            {summary?.doctorQuestions.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">🔴 {item}</p>
            ))}
            {(!summary || summary.doctorQuestions.length === 0) && <p className="text-xs text-gray-400">なし</p>}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* eConsent */}
      <Card>
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-xs">📋 eConsent ハンドオフ</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500">FHIR JSON</p>
              <p className="text-sm font-bold text-green-600">準備完了 ✅</p>
            </div>
            <div className="bg-gray-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500">医師確認</p>
              <p className="text-sm font-bold text-red-600">必須</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => {}} variant="outline" className="flex-1 text-sm">📋 JSONコピー</Button>
            <Button onClick={() => setConsentSent(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm" disabled={consentSent}>
              {consentSent ? "✅ 送信完了" : "📤 eConsent送信"}
            </Button>
          </div>
          <Button onClick={() => setRecorded(true)} className="w-full bg-green-600 hover:bg-green-700 text-sm" disabled={recorded}>
            {recorded ? "✅ 記録完了" : "📝 説明完了として記録"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const screens: Record<Step, () => ReactNode> = {
    1: renderScreen1,
    2: renderScreen2,
    3: renderScreen3,
    4: renderScreen4,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-5 py-4 text-center space-y-1">
        <p className="text-xs text-gray-500">緊急手術の同意説明支援デモ</p>
        <h1 className="text-lg font-bold text-gray-900">大動脈解離 同意説明エージェント</h1>
        <p className="text-xs text-gray-500">急性A型大動脈解離の緊急手術前に、家族説明・質問対応・理解確認・医師サマリーを4画面で支援します。</p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Badge className="bg-red-600 text-white text-xs animate-pulse">🚨 緊急モード</Badge>
          {aiSource === "gemini" && <Badge className="bg-green-600 text-white text-xs">Gemini Live</Badge>}
          {aiSource === "fallback" && <Badge className="bg-gray-500 text-white text-xs">フォールバック</Badge>}
          <Badge className="bg-amber-100 text-amber-800 text-xs">医師確認必須</Badge>
        </div>
      </header>

      {/* Step Navigation */}
      <nav className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-center gap-1 max-w-md mx-auto">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <button
              key={s}
              onClick={() => s < step || (s === step) ? setStep(s) : null}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                s === step
                  ? "bg-blue-600 text-white"
                  : s < step
                  ? "bg-blue-100 text-blue-700 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                s < step ? "bg-blue-600 text-white" : s === step ? "bg-white text-blue-600" : "bg-gray-300 text-white"
              }`}>
                {s < step ? "✓" : s}
              </span>
              <span className="hidden sm:inline">{stepLabels[s - 1]}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto p-4 pb-8">
        {screens[step]()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-4 py-3 text-center">
        <p className="text-xs text-gray-500">
          デモデータのみ。実在患者の個人情報・医療情報は使用していません。最終説明・治療判断・同意確認は資格を持つ医師が行います。
        </p>
      </footer>
    </div>
  );
}
