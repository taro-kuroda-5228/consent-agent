"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ExplanationCard = {
  id: string;
  icon?: string;
  title: string;
  content: string;
  audioNarration?: string;
};

type SessionView = {
  sessionId: string;
  status: string;
  diagnosis: string;
  plannedSurgery: string;
  explanation: ExplanationCard[];
  evidence: Array<{ evidenceId: string; title: string; sourceType: string; citation: string }>;
};

export default function FamilyExplanation() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.caseId as string;

  const [view, setView] = useState<SessionView | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  const playNarration = async (card: ExplanationCard) => {
    const text = card.audioNarration?.trim() || card.content;
    if (!text || playingCardId) return;
    setPlayingCardId(card.id);
    const finish = () => setPlayingCardId(null);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("tts unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        finish();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        finish();
      };
      await audio.play();
    } catch {
      // サーバTTSが使えない場合はブラウザ内蔵の音声合成にフォールバック
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ja-JP";
        utterance.rate = 0.95;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
      }
    }
  };
  const [familyToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("t"),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}${familyToken ? `?t=${encodeURIComponent(familyToken)}` : ""}`);
        if (cancelled) return;
        if (res.status === 404) {
          setLoadState("not-found");
          return;
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as SessionView;
        setView(data);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, familyToken]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">家族向けご説明</h1>
        <p className="text-xs text-gray-500">
          ※ 担当医師が選択した資料のみに基づく説明です
        </p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">
        {loadState === "loading" && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              ⏳ ご説明の準備をしています...
            </CardContent>
          </Card>
        )}

        {(loadState === "not-found" || loadState === "error") && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8 text-center space-y-2">
              <p className="text-sm font-bold text-amber-900">
                {loadState === "not-found"
                  ? "ご説明セッションが見つかりません"
                  : "ご説明を読み込めませんでした"}
              </p>
              <p className="text-xs text-amber-800">
                担当医師から案内されたリンク（QRコード）からアクセスしてください。
                解決しない場合は、近くのスタッフにお声がけください。
              </p>
            </CardContent>
          </Card>
        )}

        {loadState === "ready" && view && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 text-center">
                📊 担当医師が選択した{view.evidence.length}件の資料に基づく説明です
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {view.evidence.map((item) => (
                  <Badge key={item.evidenceId} variant="outline" className="text-[10px] text-blue-800 border-blue-300">
                    {item.evidenceId}
                  </Badge>
                ))}
              </div>
            </div>

            {view.explanation.map((section, idx) => (
              <Card key={section.id} className="border-l-4 border-l-blue-400">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{section.icon ?? "💬"}</span>
                    <span>{section.title}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {idx + 1}/{view.explanation.length}
                    </span>
                    <button
                      onClick={() => playNarration(section)}
                      disabled={playingCardId !== null}
                      aria-label={`${section.title}を音声で聞く`}
                      className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {playingCardId === section.id ? "🔊 再生中" : "🔊 聞く"}
                    </button>
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
                この説明は担当医師が選択した資料に基づく一般的な情報です。
                {view.diagnosis ? `（対象: ${view.diagnosis}）` : ""}
                個別の状況については担当医師が直接ご説明します。
              </p>
            </div>

            <Button
              onClick={() => router.push(`/family/${sessionId}/qa${familyToken ? `?t=${encodeURIComponent(familyToken)}` : ""}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-base py-5"
              size="lg"
            >
              ❓ 質問・理解確認へ進む
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
