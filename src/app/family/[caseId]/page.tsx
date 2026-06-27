"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoStartByCardId: Record<string, number> = {
    "disease-mechanism": 0,
    "emergency-need": 10,
    procedure: 21,
    "major-risks": 32,
    "no-surgery": 42,
    "doctor-confirmation": 50,
  };

  const playNarration = async (card: ExplanationCard) => {
    const video = videoRef.current;
    if (!video || playingCardId) return;
    setPlayingCardId(card.id);
    const startAt = videoStartByCardId[card.id] ?? 0;
    try {
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(startAt, Math.max(0, video.duration - 1))
        : startAt;
      video.scrollIntoView({ behavior: "smooth", block: "center" });
      await video.play();
    } catch {
      setPlayingCardId(null);
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
            <Card className="overflow-hidden border-blue-100 bg-white shadow-sm" data-testid="family-explanation-video">
              <video
                ref={videoRef}
                className="block aspect-video w-full bg-slate-950"
                controls
                playsInline
                preload="metadata"
                onPause={() => setPlayingCardId(null)}
                onEnded={() => setPlayingCardId(null)}
                aria-label="急性A型大動脈解離の3D説明動画"
              >
                <source src="/media/aortic-dissection-explanation.mp4" type="video/mp4" />
              </video>
              <CardContent className="px-4 py-3 text-xs leading-relaxed text-slate-600">
                まず動画で全体像を確認し、その下の説明カードで要点を順番に確認できます。
                この動画はデモ用の補助説明で、説明カードと質問回答は担当医が選択した根拠資料に基づく下書きです。最終確認は担当医が行います。
              </CardContent>
            </Card>

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
                      aria-label={`${section.title}の動画場面を再生`}
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
