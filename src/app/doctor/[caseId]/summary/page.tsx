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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">
          Dissection Consent Agent
        </h1>
        <p className="text-sm text-gray-500">
          Powered by MedEvidence × Gemini
        </p>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">医師用サマリー</h2>
            <p className="text-sm text-gray-500">
              Case: {summaryData.caseId} | 62歳男性 / Stanford Type A
            </p>
          </div>
          <Badge className="bg-red-100 text-red-800 border-red-200 text-sm px-3 py-1">
            Doctor Review: REQUIRED
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Understood */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base text-green-800">
                ✅ 理解済み
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {summary.understood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  ✅ {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* Not Understood */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base text-yellow-800">
                ⚠️ 未理解
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {summary.notUnderstood.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  ⚠️ {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* Concerns */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base text-orange-800">
                😰 家族の不安
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {summary.concerns.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  😰 {item}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* Doctor Questions */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base text-red-800">
                🔴 医師が直接答えるべき質問
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {summary.doctorQuestions.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  🔴 {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* eConsent Handoff */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">📋 eConsent Handoff</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">FHIR Consent JSON</p>
                <p className="text-sm font-bold text-green-600">Ready ✅</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-bold text-yellow-600">proposed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Understanding Score</p>
                <p className="text-sm font-bold text-blue-600">
                  {understandingScore}/{totalQuestions}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Doctor Review</p>
                <p className="text-sm font-bold text-red-600">REQUIRED</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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
