"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import demoCase from "@/data/demo-case.json";

const AVAILABLE_RISKS = [
  "死亡",
  "脳梗塞",
  "出血",
  "腎不全",
  "再手術",
  "感染",
  "麻痺",
  "心不全",
];

export default function ClinicianIntake() {
  const router = useRouter();
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
    setRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]
    );
  };

  const generateLink = () => {
    router.push("/family/demo-aad-001");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            説明同意エージェント
          </h1>
          <p className="text-xs text-gray-500">
            MedEvidence × Gemini
          </p>
        </div>
        <Badge className="bg-red-600 text-white text-xs px-3 py-1 animate-pulse">
          🚨 緊急モード
        </Badge>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Form Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">症例情報入力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 年齢・性別 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-sm">年齢</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="62"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sex" className="text-sm">性別</Label>
                <select
                  id="sex"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="">選択...</option>
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            </div>

            {/* 診断名 */}
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis" className="text-sm">診断名</Label>
              <Input
                id="diagnosis"
                placeholder="Stanford A型急性大動脈解離"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            {/* 緊急度 */}
            <div className="space-y-1.5">
              <Label htmlFor="urgency" className="text-sm">緊急度</Label>
              <select
                id="urgency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="">選択...</option>
                <option value="至急手術">至急手術</option>
                <option value="緊急手術（24時間以内）">緊急手術（24時間以内）</option>
                <option value="待機手術">待機手術</option>
              </select>
            </div>

            {/* 予定手術 */}
            <div className="space-y-1.5">
              <Label htmlFor="surgery" className="text-sm">予定手術</Label>
              <Input
                id="surgery"
                placeholder="上行大動脈置換術"
                value={plannedSurgery}
                onChange={(e) => setPlannedSurgery(e.target.value)}
              />
            </div>

            {/* 主な目的 */}
            <div className="space-y-1.5">
              <Label htmlFor="purpose" className="text-sm">主な目的</Label>
              <Textarea
                id="purpose"
                placeholder="手術の目的を記載..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* 人工心肺・輸血 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">人工心肺 (CPB)</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCardiopulmonaryBypass(!cardiopulmonaryBypass)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      cardiopulmonaryBypass ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        cardiopulmonaryBypass
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm">
                    {cardiopulmonaryBypass ? "あり" : "なし"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transfusion" className="text-sm">輸血</Label>
                <select
                  id="transfusion"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={transfusion}
                  onChange={(e) => setTransfusion(e.target.value)}
                >
                  <option value="">選択...</option>
                  <option value="必要な可能性大">必要な可能性大</option>
                  <option value="必要な可能性あり">必要な可能性あり</option>
                  <option value="可能性低い">可能性低い</option>
                </select>
              </div>
            </div>

            <Separator />

            {/* リスク */}
            <div className="space-y-2">
              <Label className="text-sm">主なリスク</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_RISKS.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => toggleRisk(risk)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      risks.includes(risk)
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>

            {/* 特記事項 */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">特記事項</Label>
              <Textarea
                id="notes"
                placeholder="特記事項があれば記載..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Status */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600">✅</span>
                  <span className="text-xs text-gray-600">エビデンス準備完了</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600">✅</span>
                  <span className="text-xs text-gray-600">安全ガード稼働中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600">✅</span>
                  <span className="text-xs text-gray-600">テンプレート読込済</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ⏱ 家族向け説明の推定所要時間：<strong>3分</strong>
            </p>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={loadDemo}
            variant="outline"
            size="lg"
          >
            📋 デモを読み込む
          </Button>
          <Button
            onClick={generateLink}
            className="bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            🔗 家族向けリンクを作成
          </Button>
        </div>
      </div>
    </div>
  );
}
