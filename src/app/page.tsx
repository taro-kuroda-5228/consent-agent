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
  "Death",
  "Stroke",
  "Bleeding",
  "Renal failure",
  "Reoperation",
  "Infection",
  "Paralysis",
  "Heart failure",
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Dissection Consent Agent
          </h1>
          <p className="text-sm text-gray-500">
            Powered by MedEvidence × Gemini
          </p>
        </div>
        <Badge className="bg-red-600 text-white text-sm px-4 py-1 animate-pulse">
          🚨 Emergency Mode
        </Badge>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>症例情報入力</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">年齢</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="62"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">性別</Label>
                    <select
                      id="sex"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                    >
                      <option value="">選択...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">診断名</Label>
                  <Input
                    id="diagnosis"
                    placeholder="Stanford Type A acute aortic dissection"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">緊急度</Label>
                  <select
                    id="urgency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                  >
                    <option value="">選択...</option>
                    <option value="Immediate emergency surgery">
                      Immediate emergency surgery
                    </option>
                    <option value="Urgent surgery (within 24h)">
                      Urgent surgery (within 24h)
                    </option>
                    <option value="Scheduled surgery">Scheduled surgery</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surgery">予定手術</Label>
                  <Input
                    id="surgery"
                    placeholder="Emergency ascending aorta replacement"
                    value={plannedSurgery}
                    onChange={(e) => setPlannedSurgery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">主な目的</Label>
                  <Textarea
                    id="purpose"
                    placeholder="手術の目的を記載..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>人工心肺 (CPB)</Label>
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
                        {cardiopulmonaryBypass ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfusion">輸血</Label>
                    <select
                      id="transfusion"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={transfusion}
                      onChange={(e) => setTransfusion(e.target.value)}
                    >
                      <option value="">選択...</option>
                      <option value="Likely required">Likely required</option>
                      <option value="May be required">May be required</option>
                      <option value="Unlikely">Unlikely</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>主なリスク</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="notes">特記事項</Label>
                  <Textarea
                    id="notes"
                    placeholder="特記事項があれば記載..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: AI Status */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  🤖 AI Preparation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="text-sm">Evidence sources ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="text-sm">Safety guardrails active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="text-sm">Templates loaded</span>
                </div>
                <Separator />
                <div className="text-sm text-gray-500">
                  ⏱ Estimated family session: <strong>3 minutes</strong>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={loadDemo}
                variant="outline"
                className="w-full"
                size="lg"
              >
                📋 Load Demo Case
              </Button>
              <Button
                onClick={generateLink}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                🔗 Generate Family Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
