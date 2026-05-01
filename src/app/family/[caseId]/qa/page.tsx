"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import qaData from "@/data/mock-qa.json";
import understandingData from "@/data/mock-understanding.json";

export default function QAPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [concerns, setConcerns] = useState("");

  const handleFreeQuestion = () => {
    if (freeQuestion.trim()) {
      setFreeAnswer(qaData.freeQAResponse);
    }
  };

  const selectAnswer = (qId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  };

  const allAnswered = understandingData.questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = () => {
    router.push(`/doctor/${caseId}/summary`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">質問 & 確認</h1>
        <p className="text-xs text-gray-500">
          ※ 担当医師の説明を補助するものです
        </p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">
        {/* FAQ */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">❓ よくある質問</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {qaData.faq.map((item, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-gray-50 flex justify-between items-center"
                >
                  <span className="pr-2">Q: {item.question}</span>
                  <span className="text-gray-400 text-lg shrink-0">
                    {expandedFAQ === idx ? "▾" : "▸"}
                  </span>
                </button>
                {expandedFAQ === idx && (
                  <div className="px-3 pb-3 text-sm text-gray-700">
                    <Separator className="mb-2" />
                    <p>A: {item.answer}</p>
                    {item.requiresDoctorReview && (
                      <Badge className="mt-2 bg-red-600 text-white text-xs">
                        🔴 担当医が直接説明します
                      </Badge>
                    )}
                  </div>
                )}
              </div>
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
              onClick={handleFreeQuestion}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!freeQuestion.trim()}
            >
              質問する
            </Button>
            {freeAnswer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">{freeAnswer}</p>
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
            {understandingData.questions.map((q, qIdx) => (
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
            <CardTitle className="text-sm">😰 不安・確認したいこと</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Textarea
              placeholder="不安なこと、確認したいことを自由に書いてください..."
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-base py-5"
          size="lg"
          disabled={!allAnswered}
        >
          📤 回答を送信
        </Button>
        {!allAnswered && (
          <p className="text-center text-xs text-gray-500">
            全ての理解度チェックに回答してください
          </p>
        )}
      </div>
    </div>
  );
}
