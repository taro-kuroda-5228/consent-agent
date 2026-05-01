"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import explanationData from "@/data/mock-explanation.json";

export default function FamilyExplanation() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">家族向けご説明</h1>
        <p className="text-xs text-gray-500">
          ※ 担当医師の説明を補助するものです
        </p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">
        {/* エビデンス */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-700">
            📊 <strong>IRADレジストリ</strong>・<strong>JACC 2024ガイドライン</strong>に基づく情報
          </p>
        </div>

        {explanationData.map((section, idx) => (
          <Card key={section.id} className="border-l-4 border-l-blue-400">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">{section.icon}</span>
                <span>{section.title}</span>
                {idx < explanationData.length - 1 && (
                  <span className="ml-auto text-xs text-gray-400">{idx + 1}/{explanationData.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}

        <Separator className="my-3" />

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            💡 <strong>ご注意:</strong>{" "}
            この説明は一般的な情報です。個別の状況については担当医師にお尋ねください。
          </p>
        </div>

        <Button
          onClick={() => router.push(`/family/${caseId}/qa`)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-base py-5"
          size="lg"
        >
          ❓ 質問する
        </Button>
      </div>
    </div>
  );
}
