"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import summaryData from "@/data/mock-summary.json";

export default function DoctorSummary() {
  const [consentSent, setConsentSent] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const copyJSON = async () => {
    const json = JSON.stringify(summaryData.fhirConsent, null, 2);
    await navigator.clipboard.writeText(json);
    toast.success("FHIR Consent JSON をコピーしました");
  };

  const sendConsent = () => {
    setConsentSent(true);
    toast.success("eConsent を送信しました");
  };

  const recordComplete = () => {
    setRecorded(true);
    toast.success("説明完了として記録しました");
  };

  const { summary, understandingScore, totalQuestions } = summaryData;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-5 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">
          説明同意エージェント
        </h1>
        <p className="text-xs text-gray-500">
          MedEvidence × Gemini
        </p>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">医師用サマリー</h2>
            <p className="text-xs text-gray-500">
              症例: {summaryData.caseId} / 62歳男性 / Stanford A型
            </p>
          </div>
          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-3 py-1">
            🔴 医師確認：必須
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 理解済み */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-green-800">
                ✅ 理解済み
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {summary.understood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  ✅ {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* 未理解 */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-yellow-800">
                ⚠️ 未理解
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {summary.notUnderstood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  ⚠️ {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* 不安 */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-orange-800">
                😰 家族の不安
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {summary.concerns.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  😰 {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* 医師直接回答 */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm text-red-800">
                🔴 医師が直接答えるべき質問
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0.5">
              {summary.doctorQuestions.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  🔴 {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* eConsent */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">📋 eConsent ハンドオフ</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">FHIR JSON</p>
                <p className="text-sm font-bold text-green-600">準備完了 ✅</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">ステータス</p>
                <p className="text-sm font-bold text-yellow-600">提案済み</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">理解度スコア</p>
                <p className="text-sm font-bold text-blue-600">
                  {understandingScore}/{totalQuestions}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">医師確認</p>
                <p className="text-sm font-bold text-red-600">必須</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyJSON}
                variant="outline"
                className="flex-1"
              >
                📋 JSONをコピー
              </Button>
              <Button
                onClick={sendConsent}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={consentSent}
              >
                {consentSent ? "✅ 送信完了" : "📤 eConsentへ送信"}
              </Button>
            </div>

            <Separator />

            <Button
              onClick={recordComplete}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={recorded}
              size="lg"
            >
              {recorded ? "✅ 記録完了" : "📝 説明完了として記録"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
