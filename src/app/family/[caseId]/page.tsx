"use client";

import { useEffect, useState } from "react";
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
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-950">🎥 動画と音声付き説明</CardTitle>
                <p className="text-xs leading-relaxed text-slate-600">まず動画で全体像を確認できます。</p>
              </CardHeader>
              <video
                className="block aspect-video w-full bg-slate-950"
                controls
                playsInline
                preload="metadata"
                aria-label="急性A型大動脈解離の3D説明動画"
              >
                <source src="/media/aortic-dissection-explanation.mp4" type="video/mp4" />
                お使いのブラウザでは動画を再生できません。
              </video>
              <CardContent className="px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700" data-testid="family-friendly-summary">
                動画を見たあと、分からないことは次の質問・理解確認でそのまま聞けます。
              </CardContent>
            </Card>

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
