"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  createPhysicianUploadedEvidence,
  evaluateEvidenceSufficiency,
  getDefaultSelectedEvidenceIds,
  getEvidenceCatalog,
  getDefaultFacilityAnswerTemplates,
  type EvidenceCandidateSuggestion,
  type EvidenceCard,
  type EvidenceSufficiencyTopic,
  type FacilityAnswerTemplate,
} from "@/lib/consent-demo";
import { PHYSICIAN_QUICK_CASES, resolveExplanationStartCase, type PhysicianQuickCase } from "@/lib/physician-intake";
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
  retrievalMode?: string;
  evidenceReferences?: string[];
  retrievedEvidence?: EvidenceCard[];
  templateReferences?: FacilityAnswerTemplate[];
}

const SAFETY_LABEL_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "一般説明", color: "bg-green-100 text-green-800" },
  "facility-template": { label: "施設確認済み", color: "bg-violet-100 text-violet-900" },
  "doctor-review": { label: "医師確認が必要", color: "bg-red-100 text-red-800" },
  "individual-prognosis": { label: "個別予後は断定不可", color: "bg-orange-100 text-orange-800" },
  "consent-guidance": { label: "同意誘導禁止", color: "bg-purple-100 text-purple-800" },
};

const FAQ = [
  { question: "死亡率は？", answer: "施設テンプレ回答を優先し、当院標準値を短く答えます。", requiresDoctorReview: true },
  { question: "大動脈解離とはどのような病気ですか？", answer: "大動脈の壁が裂け、血液が壁の中に入り込む病気です。破裂や臓器血流低下につながることがあります。", requiresDoctorReview: false },
  { question: "急いで同意しないといけませんか？", answer: "急性A型大動脈解離では、破裂や心タンポナーデなどで急に命に関わるため、短時間で治療方針を確認する必要があります。", requiresDoctorReview: true },
  { question: "なぜすぐに手術が必要なのですか？", answer: "Stanford A型では心臓に近い大動脈が裂けており、破裂や心タンポナーデなどで急に命に関わるためです。", requiresDoctorReview: false },
  { question: "脳梗塞のリスクについて、もう少し詳しく教えてください。", answer: "手術中や解離そのものの影響で脳への血流が悪くなる可能性があります。個別のリスクは担当医が直接説明します。", requiresDoctorReview: true },
];

const OMNI_EXPLANATION_STORYBOARD = [
  {
    id: "ct-image",
    mode: "画像",
    icon: "🖼️",
    title: "CT画像で、どこが裂けているかを示す",
    description: "Gemini Omniが模式CTを指し示しながら、心臓に近い大動脈に裂け目があることを説明します。",
  },
  {
    id: "animation",
    mode: "動画",
    icon: "🎞️",
    title: "放置した場合と手術の目的を30秒動画で説明",
    description: "破裂・心タンポナーデ・臓器血流障害を防ぐために緊急手術が必要、という流れを短いアニメで見せます。",
  },
  {
    id: "voice",
    mode: "音声",
    icon: "🔊",
    title: "音声で要点を読み上げ、患者さんのペースで一時停止",
    description: "難しい言葉を避け、必要に応じて同じ内容を言い換えます。今は決定論的mock、実運用ではGemini Omni/Live APIへ差し替えます。",
  },
];

const UNDERSTANDING_QUESTIONS = [
  { id: "q1", question: "今回の病気はどの血管に起きていますか？", options: ["肺動脈", "大動脈", "冠動脈", "腎動脈"], correctIndex: 1 },
  { id: "q2", question: "なぜ緊急手術が必要ですか？", options: ["痛みが強いから", "血管が破裂する危険があるから", "感染するから", "薬が効かないから"], correctIndex: 1 },
  { id: "q3", question: "手術の主なリスクは何ですか？", options: ["出血・脳梗塞など", "傷が残る", "入院が長い", "痛い"], correctIndex: 0 },
  { id: "q4", question: "最終的な判断は誰がしますか？", options: ["AI", "家族", "担当医師", "看護師"], correctIndex: 2 },
];

const EVIDENCE_TOPIC_LABELS: Record<EvidenceSufficiencyTopic, string> = {
  "disease-definition": "疾患説明",
  "emergency-need": "緊急性",
  "procedure-purpose": "手術目的",
  "major-complications": "主要合併症",
  "physician-ai-boundary": "医師/AI境界",
};

type Step = 1 | 2 | 3 | 4;

// ---- Main Component ----
export default function ConsentAgent() {
  const [step, setStep] = useState<Step>(1);

  // Screen 1 state
  const baseEvidenceCatalog = getEvidenceCatalog();
  const defaultFacilityTemplates = getDefaultFacilityAnswerTemplates();
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceCard[]>([]);
  const [deletedEvidenceIds, setDeletedEvidenceIds] = useState<string[]>([]);
  const evidenceCatalog = [...baseEvidenceCatalog, ...uploadedEvidence].filter((item) => !deletedEvidenceIds.includes(item.evidenceId));
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(getDefaultSelectedEvidenceIds());
  const selectedEvidence = evidenceCatalog.filter((item) => selectedEvidenceIds.includes(item.evidenceId));
  const evidenceSufficiency = evaluateEvidenceSufficiency(selectedEvidence);
  const evidenceCoverageReady = evidenceSufficiency.status === "ready";
  const [evidenceSuggestion, setEvidenceSuggestion] = useState<EvidenceCandidateSuggestion | null>(null);
  const [loadingEvidenceSuggestion, setLoadingEvidenceSuggestion] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("日本のガイドライン / 非PubMed論文PDF");
  const [uploadSourceUrl, setUploadSourceUrl] = useState("");
  const [uploadClinicalScope, setUploadClinicalScope] = useState("急性A型大動脈解離 / ATAAD physician-uploaded source");
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadText, setUploadText] = useState("");
  const [uploadFileName, setUploadFileName] = useState("uploaded-evidence.pdf");
  const [uploadMessage, setUploadMessage] = useState("");
  const [facilityTemplates, setFacilityTemplates] = useState<FacilityAnswerTemplate[]>(defaultFacilityTemplates);
  const [enabledFacilityTemplateIds, setEnabledFacilityTemplateIds] = useState<string[]>(defaultFacilityTemplates.map((item) => item.templateId));
  const [newFacilityTemplateLabel, setNewFacilityTemplateLabel] = useState("当院標準: A型大動脈解離 合併症リスク");
  const [newFacilityTemplatePatterns, setNewFacilityTemplatePatterns] = useState("脳梗塞, 出血, 腎不全");
  const [newFacilityTemplateAnswer, setNewFacilityTemplateAnswer] = useState("当院では、脳梗塞・出血・腎不全などの主な合併症リスクを、患者さんの状態に合わせて担当医が説明します。");
  const [facilityTemplateMessage, setFacilityTemplateMessage] = useState("");
  const selectedFacilityTemplates = facilityTemplates.filter((item) => enabledFacilityTemplateIds.includes(item.templateId));
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

  // Screen 3 state
  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<QAResult | null>(null);
  const [loading3, setLoading3] = useState(false);
  const [qaLog, setQaLog] = useState<{ question: string; answer: string; safetyLabel: string }[]>([]);
  const [understandingAnswers, setUnderstandingAnswers] = useState<Record<string, number>>({});
  const [concerns, setConcerns] = useState("");

  // Screen 4 state
  const [summary, setSummary] = useState<{
    concerns: string[];
    familyQuestions: { question: string; answer: string; needsDoctorFollowUp: boolean }[];
  } | null>(null);
  const [consentSent, setConsentSent] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const AVAILABLE_RISKS = ["死亡", "脳梗塞", "出血", "腎不全", "再手術", "感染", "麻痺", "心不全"];

  const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  };

  // ---- Handlers ----
  const applyQuickCase = (quickCase: PhysicianQuickCase) => {
    setAge(quickCase.age);
    setSex(quickCase.sex);
    setDiagnosis(quickCase.diagnosis);
    setUrgency(quickCase.urgency);
    setPlannedSurgery(quickCase.plannedSurgery);
    setPurpose(quickCase.purpose);
    setCardiopulmonaryBypass(quickCase.cardiopulmonaryBypass);
    setTransfusion(quickCase.transfusion);
    setRisks(quickCase.risks);
    setNotes(quickCase.notes);
    setSelectedEvidenceIds(evidenceCatalog.map((item) => item.evidenceId));
    setEvidenceSuggestion(null);
  };

  const suggestEvidence = async () => {
    if (!diagnosis || !plannedSurgery) return;
    setLoadingEvidenceSuggestion(true);
    try {
      const res = await fetchWithTimeout("/api/evidence/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis, plannedSurgery, risks }),
      }, 5000);
      if (!res.ok) throw new Error("API error");
      const data: EvidenceCandidateSuggestion = await res.json();
      setEvidenceSuggestion(data);
      setSelectedEvidenceIds(data.suggestedEvidence.map((item) => item.evidenceId));
    } catch {
      setEvidenceSuggestion({
        mode: "medevidence-ai-candidate-suggestion",
        retrievalMode: "medevidence-rag-plus-facility-candidate",
        sourcePolicy: "候補抽出に失敗したため、デフォルト根拠を医師確認用に提示しています。引用可否は医師が最終選択します。",
        suggestedEvidence: selectedEvidence,
        rationaleByEvidenceId: Object.fromEntries(
          selectedEvidence.map((item) => [item.evidenceId, "デフォルト選択根拠です。医師が引用可否を確認してください。"]),
        ),
        searchTrace: ["候補抽出API失敗", "デフォルト根拠を維持"],
      });
    }
    setLoadingEvidenceSuggestion(false);
  };

  const toggleRisk = (risk: string) => {
    setRisks((prev) => prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]);
  };

  const toggleEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(evidenceId)
        ? prev.filter((id) => id !== evidenceId)
        : [...prev, evidenceId],
    );
  };

  const deleteEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds((prev) => prev.filter((id) => id !== evidenceId));
    setUploadedEvidence((prev) => prev.filter((item) => item.evidenceId !== evidenceId));
    setDeletedEvidenceIds((prev) => Array.from(new Set([...prev, evidenceId])));
    setEvidenceSuggestion((prev) => prev ? {
      ...prev,
      suggestedEvidence: prev.suggestedEvidence.filter((item) => item.evidenceId !== evidenceId),
      rationaleByEvidenceId: Object.fromEntries(
        Object.entries(prev.rationaleByEvidenceId).filter(([id]) => id !== evidenceId),
      ),
    } : prev);
  };

  const toggleFacilityTemplate = (templateId: string) => {
    setEnabledFacilityTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId],
    );
  };

  const updateFacilityTemplateAnswer = (templateId: string, answer: string) => {
    setFacilityTemplates((prev) =>
      prev.map((item) =>
        item.templateId === templateId
          ? { ...item, answer, doctorBurden: "physician-edited", lastReviewedLabel: "この画面で編集済み" }
          : item,
      ),
    );
  };

  const deleteFacilityTemplate = (templateId: string) => {
    setFacilityTemplates((prev) => prev.filter((item) => item.templateId !== templateId));
    setEnabledFacilityTemplateIds((prev) => prev.filter((id) => id !== templateId));
    setFacilityTemplateMessage(`削除しました: ${templateId}`);
  };


  const addFacilityTemplate = () => {
    const label = newFacilityTemplateLabel.trim();
    const answer = newFacilityTemplateAnswer.trim();
    const questionPatterns = newFacilityTemplatePatterns
      .split(/[、,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!label || !answer || questionPatterns.length === 0) {
      setFacilityTemplateMessage("見出し・反応する質問・回答本文を入力してください。");
      return;
    }

    const slug = label
      .toUpperCase()
      .replace(/[^A-Z0-9一-龠ぁ-んァ-ン]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "CUSTOM";
    const baseId = `FAC-TPL-${slug}`;
    let templateId = baseId;
    let suffix = 2;
    while (facilityTemplates.some((item) => item.templateId === templateId)) {
      templateId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const template: FacilityAnswerTemplate = {
      templateId,
      label,
      questionPatterns,
      answer,
      scope: "この画面で追加された施設別テンプレ回答。医師が内容を確認済みとして患者Q&Aで優先使用します。",
      doctorBurden: "physician-edited",
      lastReviewedLabel: "この画面で追加済み",
    };

    setFacilityTemplates((prev) => [...prev, template]);
    setEnabledFacilityTemplateIds((prev) => Array.from(new Set([...prev, templateId])));
    setFacilityTemplateMessage(`追加しました: ${templateId}`);
    setNewFacilityTemplateLabel("");
    setNewFacilityTemplatePatterns("");
    setNewFacilityTemplateAnswer("");
  };

  const handleEvidenceFileUpload = async (file?: File) => {
    if (!file) return;
    setUploadingEvidence(true);
    setUploadMessage("PDF本文を抽出中です。抽出後に医師が内容を確認してください。");
    setUploadFileName(file.name);
    if (uploadTitle === "日本のガイドライン / 非PubMed論文PDF") {
      setUploadTitle(file.name.replace(/\.pdf$/i, ""));
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithTimeout("/api/evidence/upload", { method: "POST", body: form }, 15000);
      if (!res.ok) throw new Error("upload failed");
      const data: { extractedText?: string; warning?: string; privacyNote?: string } = await res.json();
      setUploadText(data.extractedText || "");
      setUploadMessage(data.warning || data.privacyNote || "抽出しました。医師が要約・本文・出典リンクを確認してから根拠に追加してください。");
    } catch {
      setUploadMessage("PDF抽出に失敗しました。本文または要約を貼り付けて、医師確認済み根拠として追加してください。");
    }
    setUploadingEvidence(false);
  };

  const handleEvidenceUrlImport = async () => {
    if (!uploadSourceUrl.trim()) return;
    setUploadingEvidence(true);
    setUploadMessage("URLから参考資料を取り込み、根拠カードの下書きを作成中です。医師は採用/不採用だけ確認してください。");
    try {
      const form = new FormData();
      form.append("sourceUrl", uploadSourceUrl.trim());
      const res = await fetchWithTimeout("/api/evidence/upload", { method: "POST", body: form }, 30000);
      if (!res.ok) throw new Error("url import failed");
      const data: { fileName?: string; extractedText?: string; warning?: string; privacyNote?: string; evidenceCard?: EvidenceCard } = await res.json();
      if (data.evidenceCard) {
        setUploadedEvidence((prev) => [...prev.filter((item) => item.evidenceId !== data.evidenceCard?.evidenceId), data.evidenceCard as EvidenceCard]);
        setSelectedEvidenceIds((prev) => Array.from(new Set([...prev, data.evidenceCard!.evidenceId])));
        setUploadTitle(data.evidenceCard.title);
        setUploadClinicalScope(data.evidenceCard.clinicalScope || uploadClinicalScope);
        setUploadSummary(data.evidenceCard.clinicianSummary || "");
        setUploadText(data.evidenceCard.displayForFamily || "");
        setUploadMessage("根拠カードの下書きを作成し、選択済みにしました。医師はカードを見て、不要ならチェックを外すだけです。");
        setUploadingEvidence(false);
        return;
      }
      if (data.fileName) {
        setUploadFileName(data.fileName);
        if (uploadTitle === "日本のガイドライン / 非PubMed論文PDF") {
          setUploadTitle(data.fileName.replace(/\.pdf$/i, ""));
        }
      }
      setUploadText(data.extractedText || "");
      setUploadMessage(data.warning || data.privacyNote || "URLから抽出しました。根拠カード作成に失敗した場合のみ、本文/要約を最小限補足してください。");
    } catch {
      setUploadMessage("URLからのPDF抽出に失敗しました。PDFをダウンロードしてアップロードするか、本文/要約を貼り付けてください。");
    }
    setUploadingEvidence(false);
  };

  const addUploadedEvidence = () => {
    const uploaded = createPhysicianUploadedEvidence({
      title: uploadTitle,
      fileName: uploadFileName,
      sourceUrl: uploadSourceUrl,
      extractedText: uploadText || uploadSummary,
      clinicianSummary: uploadSummary,
      clinicalScope: uploadClinicalScope,
    });
    setUploadedEvidence((prev) => [...prev.filter((item) => item.evidenceId !== uploaded.evidenceId), uploaded]);
    setSelectedEvidenceIds((prev) => Array.from(new Set([...prev, uploaded.evidenceId])));
    setUploadMessage(`追加しました: ${uploaded.evidenceId}。家族説明/Q&Aでは医師が選択した場合のみ引用されます。`);
  };

  const startExplanation = async () => {
    const startCase = resolveExplanationStartCase({
      age,
      sex,
      diagnosis,
      urgency,
      plannedSurgery,
      purpose,
      cardiopulmonaryBypass,
      transfusion,
      risks,
      notes,
    });
    if (startCase.usedFallbackPreset) {
      applyQuickCase(startCase);
    }

    setFreeAnswer(null);
    setFreeQuestion("");
    setLoading1(true);
    try {
      const res = await fetchWithTimeout("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: startCase.diagnosis,
          plannedSurgery: startCase.plannedSurgery,
          risks: startCase.risks,
          urgency: startCase.urgency,
          purpose: startCase.purpose,
          cardiopulmonaryBypass: startCase.cardiopulmonaryBypass,
          transfusion: startCase.transfusion,
          notes: startCase.notes,
          selectedEvidenceIds,
          customEvidence: uploadedEvidence,
          facilityAnswerTemplates: selectedFacilityTemplates,
        }),
      }, 5000);
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
        setAiSource("gemini");
      } else {
        throw new Error("API error");
      }
    } catch {
      const { default: mock } = await import("@/data/mock-explanation.json");
      setExplanation(mock);
      setAiSource("fallback");
    }
    setLoading1(false);
    setStep(2);
  };

  const handleFreeQuestion = async (questionOverride?: string) => {
    const askedQuestion = (questionOverride ?? freeQuestion).trim();
    if (!askedQuestion) return;
    setFreeQuestion(askedQuestion);
    setLoading3(true);
    try {
      const res = await fetchWithTimeout("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askedQuestion,
          diagnosis,
          plannedSurgery,
          risks,
          selectedEvidenceIds,
          customEvidence: uploadedEvidence,
          facilityAnswerTemplates: selectedFacilityTemplates,
        }),
      }, 5000);
      if (res.ok) {
        const data = await res.json();
        setFreeAnswer(data);
        setQaLog((prev) => [...prev, { question: askedQuestion, answer: data.answer, safetyLabel: data.safetyLabel }]);
      } else {
        throw new Error("API error");
      }
    } catch {
      const fallback = {
        answer: "選択済み参考資料内には、この質問に直接答えられる記載が見つかりません。",
        safetyLabel: "doctor-review",
        requiresDoctorReview: true,
        retrievalMode: "physician-curated-only",
        evidenceReferences: [],
        retrievedEvidence: [],
      };
      setFreeAnswer(fallback);
      setQaLog((prev) => [...prev, { question: askedQuestion, answer: fallback.answer, safetyLabel: fallback.safetyLabel }]);
    }
    setLoading3(false);
  };

  const selectUnderstanding = (qId: string, optIdx: number) => {
    setUnderstandingAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const allAnswered = UNDERSTANDING_QUESTIONS.every((q) => understandingAnswers[q.id] !== undefined);

  const goToStep = (target: Step) => {
    if (target === 1 || target <= step) {
      setStep(target);
      return;
    }
    if (target === 2) {
      void startExplanation();
    }
  };

  const submitToDoctor = async () => {
    setSummary({
      concerns: concerns.trim() ? [concerns.trim()] : [],
      familyQuestions: qaLog.map((q) => ({
        question: q.question,
        answer: q.answer,
        needsDoctorFollowUp: q.safetyLabel === "doctor-review" || q.safetyLabel === "individual-prognosis",
      })),
    });
    setStep(4);
  };

  // ---- Render Helpers ----
  const stepLabels = ["医師入力", "Gemini Omni説明", "理解確認", "医師サマリー"];

  // ---- Screen Renderers ----
  const renderScreen1 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-lg font-bold">医師入力</h2>
        <p className="text-xs text-gray-500">まずプリセットを選ぶだけ。個人情報は入れないデモ症例です。</p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-blue-950">最短30秒</p>
            <p className="text-[11px] leading-relaxed text-blue-800">症例プリセット → 根拠確認 → 家族説明開始</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-blue-700">医師は必要時だけ修正</span>
        </div>
        <div className="mt-3 grid gap-2">
          {PHYSICIAN_QUICK_CASES.map((quickCase) => (
            <button
              key={quickCase.id}
              type="button"
              onClick={() => applyQuickCase(quickCase)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                diagnosis === quickCase.diagnosis && plannedSurgery === quickCase.plannedSurgery
                  ? "border-blue-600 bg-white shadow-sm"
                  : "border-blue-100 bg-white/80 hover:border-blue-400"
              }`}
            >
              <span className="block text-sm font-bold text-slate-950">{quickCase.label}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">{quickCase.description}</span>
            </button>
          ))}
        </div>
      </div>

      {diagnosis || plannedSurgery ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-950">今回の説明</p>
              <p className="mt-1 leading-relaxed text-slate-700">{diagnosis || "診断未選択"} / {plannedSurgery || "術式未選択"}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">主なリスク: {risks.length ? risks.join("・") : "未選択"}</p>
            </div>
            <Badge className="shrink-0 bg-red-100 text-red-800">{urgency || "緊急度未選択"}</Badge>
          </div>
        </div>
      ) : null}

      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">詳細を編集する（必要時のみ）</summary>
        <div className="mt-3 space-y-3">
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
        </div>
      </details>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">家族説明で引用する根拠</Label>
          <span className="text-[11px] text-blue-700 font-medium">医師選択のみ引用</span>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-indigo-900">MedEvidence根拠候補</p>
            <Button
              type="button"
              variant="outline"
              className="h-7 shrink-0 border-indigo-200 bg-white px-2 text-[11px] text-indigo-800 hover:bg-indigo-100"
              onClick={suggestEvidence}
              disabled={loadingEvidenceSuggestion || !diagnosis || !plannedSurgery}
            >
              {loadingEvidenceSuggestion ? "候補確認中" : "根拠候補"}
            </Button>
          </div>
          {evidenceSuggestion ? (
            <div className="mt-1 text-[11px] leading-relaxed text-indigo-700">
              候補: {evidenceSuggestion.suggestedEvidence.map((item) => item.evidenceId).join(" / ") || "なし"}
              <details className="mt-1">
                <summary className="cursor-pointer font-semibold text-gray-700">理由</summary>
                <div className="mt-1 space-y-1 text-gray-600">
                  {evidenceSuggestion.suggestedEvidence.map((item) => (
                    <p key={item.evidenceId}>
                      <span className="font-bold text-indigo-800">{item.evidenceId}</span>: {evidenceSuggestion.rationaleByEvidenceId[item.evidenceId]}
                    </p>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">
              診断・術式・リスクから候補を出し、医師が最終選択します。
            </p>
          )}
        </div>

        <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-amber-900">
            日本のガイドライン・非PubMed資料URLを追加
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-[11px] leading-relaxed text-amber-800">
            URLを貼るだけで要約・主要所見・outcomeタグの下書きを作成します。医師は作成されたカードを見て、使わない場合だけチェックを外してください。PHI/PIIを含む資料は使わないでください。
            </p>
            <Input
              type="file"
              accept="application/pdf,text/plain,.pdf,.txt"
              onChange={(e) => handleEvidenceFileUpload(e.target.files?.[0])}
              disabled={uploadingEvidence}
              className="bg-white text-xs"
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input placeholder="資料タイトル" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="bg-white text-xs" />
              <div className="flex gap-2">
                <Input placeholder="出典元URL（任意: 学会/出版社/院内文書URL）" value={uploadSourceUrl} onChange={(e) => setUploadSourceUrl(e.target.value)} className="bg-white text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 shrink-0 border-amber-300 bg-white px-2 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                  onClick={handleEvidenceUrlImport}
                  disabled={uploadingEvidence || !uploadSourceUrl.trim()}
                >
                  URLで自動作成
                </Button>
              </div>
            </div>
            <Input placeholder="対象スコープ" value={uploadClinicalScope} onChange={(e) => setUploadClinicalScope(e.target.value)} className="bg-white text-xs" />
            <Textarea
              placeholder="医師向け要約: ぱっと見で分かる内容を入力"
              value={uploadSummary}
              onChange={(e) => setUploadSummary(e.target.value)}
              rows={2}
              className="bg-white text-xs"
            />
            <Textarea
              placeholder="PDFから抽出された本文、または医師が貼り付けた引用可能な本文"
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              rows={4}
              className="bg-white text-xs"
            />
            {uploadMessage && <p className="text-[11px] leading-relaxed text-amber-800">{uploadMessage}</p>}
            <Button
              type="button"
              variant="outline"
              className="h-8 border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100"
              onClick={addUploadedEvidence}
              disabled={uploadingEvidence || (!uploadText.trim() && !uploadSummary.trim())}
            >
              {uploadingEvidence ? "抽出中" : "医師確認済み根拠として追加"}
            </Button>
          </div>
        </details>

        <details className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            選択中の根拠 {selectedEvidenceIds.length}件を確認・変更
          </summary>
          <div className="mt-3 space-y-2">
            {evidenceCatalog.map((item) => {
              const selected = selectedEvidenceIds.includes(item.evidenceId);
              return (
                <div
                  key={item.evidenceId}
                  className={`w-full rounded-xl border p-3 transition-colors ${
                    selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleEvidence(item.evidenceId)}
                      aria-label={`${item.evidenceId}を家族説明で引用する根拠に${selected ? "含めない" : "含める"}`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                        selected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-slate-900 text-white text-[10px]">{item.evidenceId}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">{item.sourceType}</Badge>
                        {item.retrievalStatus === "pubmed-verified" && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">PubMed確認済み</Badge>
                        )}
                        {evidenceSuggestion?.suggestedEvidence.some((candidate) => candidate.evidenceId === item.evidenceId) && (
                          <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">候補</Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteEvidence(item.evidenceId)}
                          aria-label={`${item.evidenceId}を根拠一覧から削除`}
                          className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-black text-red-700 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                      {item.clinicalScope && (
                        <Badge className="bg-amber-100 text-amber-900 text-[10px]">対象: {item.clinicalScope}</Badge>
                      )}
                      {item.clinicianSummary && (
                        <p className="rounded-lg bg-white/80 px-2 py-1.5 text-[11px] font-medium leading-relaxed text-gray-800">
                          医師向け要約: {item.clinicianSummary}
                        </p>
                      )}
                      {item.outcomeTags && item.outcomeTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.outcomeTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.keyFindings && item.keyFindings.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-gray-600">
                          {item.keyFindings.map((finding) => (
                            <li key={finding}>{finding}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] leading-relaxed text-gray-600">家族向け: {item.displayForFamily}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                        <span>{item.citation}</span>
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline underline-offset-2"
                          >
                            出典元リンクでfact check
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
        <p className="text-[11px] text-gray-500">
          家族画面の回答は、ここで選んだ施設資料・論文・ガイドラインだけから引用します。
        </p>


        <details className="rounded-xl border border-violet-200 bg-violet-50 p-3" open>
          <summary className="cursor-pointer text-sm font-bold text-violet-950">
            施設別テンプレ回答（医師は必要時だけ修正）
          </summary>
          <p className="mt-2 text-[11px] leading-relaxed text-violet-800">
            死亡率など頻出質問は、文献検索ではなく施設標準の短い回答を優先します。初期値は自動登録され、医師は違う場合だけ編集・OFFにできます。
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-violet-300 bg-white p-3">
            <p className="text-xs font-black text-violet-950">新しい施設テンプレ回答を追加</p>
            <div className="mt-2 grid gap-2">
              <Input
                value={newFacilityTemplateLabel}
                onChange={(e) => setNewFacilityTemplateLabel(e.target.value)}
                placeholder="見出し（例: 当院標準: 合併症リスク）"
                className="bg-white text-xs"
              />
              <Input
                value={newFacilityTemplatePatterns}
                onChange={(e) => setNewFacilityTemplatePatterns(e.target.value)}
                placeholder="反応する質問（カンマ区切り: 脳梗塞, 出血, 腎不全）"
                className="bg-white text-xs"
              />
              <Textarea
                value={newFacilityTemplateAnswer}
                onChange={(e) => setNewFacilityTemplateAnswer(e.target.value)}
                rows={3}
                placeholder="患者さんに返す施設標準回答"
                className="bg-white text-xs leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={addFacilityTemplate} className="bg-violet-700 text-white hover:bg-violet-800">
                  施設テンプレ回答を追加
                </Button>
                {facilityTemplateMessage && <span className="text-[11px] font-bold text-violet-800">{facilityTemplateMessage}</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {facilityTemplates.map((template) => {
              const enabled = enabledFacilityTemplateIds.includes(template.templateId);
              return (
                <div key={template.templateId} className={`rounded-xl border p-3 ${enabled ? "border-violet-400 bg-white" : "border-violet-100 bg-white/60"}`}>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFacilityTemplate(template.templateId)}
                      aria-label={`${template.templateId}を施設テンプレ回答に${enabled ? "含めない" : "含める"}`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                        enabled ? "border-violet-600 bg-violet-600 text-white" : "border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-violet-100 text-violet-900 text-[10px]">{template.templateId}</Badge>
                        <Badge className="bg-white text-violet-700 text-[10px]">{template.lastReviewedLabel}</Badge>
                        <button
                          type="button"
                          onClick={() => deleteFacilityTemplate(template.templateId)}
                          aria-label={`${template.templateId}を施設テンプレ回答から削除`}
                          className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-black text-red-700 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-950">{template.label}</p>
                      <Textarea
                        value={template.answer}
                        onChange={(e) => updateFacilityTemplateAnswer(template.templateId, e.target.value)}
                        rows={3}
                        className="bg-white text-xs leading-relaxed"
                      />
                      <p className="text-[11px] text-violet-700">反応する質問: {template.questionPatterns.join(" / ")}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
        <div className={`rounded-xl border p-3 ${evidenceCoverageReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-bold ${evidenceCoverageReady ? "text-emerald-900" : "text-amber-950"}`}>
                {evidenceCoverageReady ? "根拠カバレッジ: 説明開始可能" : "根拠カバレッジ: 不足あり"}
              </p>
              <p className={`mt-1 text-[11px] leading-relaxed ${evidenceCoverageReady ? "text-emerald-800" : "text-amber-900"}`}>
                {evidenceCoverageReady
                  ? "疾患・緊急性・手術目的・主要合併症・医師責任境界が選択根拠内で確認できます。"
                  : "不足がある場合も医師overrideで開始できますが、家族向け回答は選択済み根拠の範囲に限定されます。"}
              </p>
            </div>
            <Badge className={evidenceCoverageReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}>
              {evidenceSufficiency.coveredTopics.length}/5
            </Badge>
          </div>
          {evidenceSufficiency.missingTopics.length > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-amber-950">
              不足トピック: {evidenceSufficiency.missingTopics.map((topic) => EVIDENCE_TOPIC_LABELS[topic]).join(" / ")}
            </p>
          )}
          {evidenceSufficiency.majorComplicationCategories.length > 0 && (
            <p className="mt-1 text-[11px] font-medium text-slate-600">
              合併症カテゴリ: {evidenceSufficiency.majorComplicationCategories.join(" / ")}
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={startExplanation} className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:text-white disabled:opacity-100" disabled={loading1}>
          {loading1 ? "説明を準備中..." : !evidenceCoverageReady ? "医師overrideで開始" : diagnosis ? "家族説明を開始" : "デモ症例で家族説明を開始"}
        </Button>
      </div>
    </div>
  );

  const renderScreen2 = () => (
    <div className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-slate-200 space-y-7">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-2xl font-black text-white">
          Omni
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Gemini Omni説明</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">画像・動画・音声で説明してから、理解確認へ進みます。</p>
        </div>
      </div>

      <section className="rounded-3xl border border-sky-100 bg-sky-50 p-5 text-slate-950">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-sky-600 text-white text-sm">Gemini Omni mock</Badge>
          <Badge className="bg-white text-sky-800 text-sm">画像 + 動画 + 音声</Badge>
          <Badge className="bg-white text-sky-800 text-sm">患者ペース</Badge>
        </div>
        <div className="mt-5 overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-inner">
          <div className="aspect-video bg-gradient-to-br from-slate-950 via-blue-950 to-sky-700 p-5 text-white">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">模式CT / 血流アニメーション</span>
                <span className="animate-pulse rounded-full bg-red-500 px-3 py-1 text-xs font-black">説明中</span>
              </div>
              <div className="grid grid-cols-3 items-end gap-3">
                <div className="h-24 rounded-full border-4 border-sky-300 bg-sky-300/20" />
                <div className="relative h-32 rounded-full border-4 border-red-300 bg-red-300/20">
                  <span className="absolute -right-3 top-10 rounded-full bg-red-500 px-2 py-1 text-xs font-black">裂け目</span>
                </div>
                <div className="h-20 rounded-full border-4 border-sky-300 bg-sky-300/20" />
              </div>
              <p className="text-xl font-black leading-relaxed">心臓に近い大動脈が裂けており、破裂や臓器血流障害を防ぐため緊急手術を行います。</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {OMNI_EXPLANATION_STORYBOARD.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sky-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700">{item.mode}</Badge>
                    <p className="text-base font-black text-slate-950">{item.title}</p>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {explanation.length > 0 && (
        <details className="rounded-3xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-xl font-black text-slate-900">説明スクリプトを確認</summary>
          <div className="mt-4 space-y-3">
            {explanation.map((card) => (
              <div key={card.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-base font-black text-slate-900">{card.icon} {card.title}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{card.content}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <Button onClick={() => setStep(3)} className="w-full rounded-full bg-slate-950 py-7 text-xl font-black text-white hover:bg-slate-800">
        説明を聞いたので理解確認へ進む
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
          <CardTitle className="text-sm">❓ よくある家族の質問</CardTitle>
          <p className="text-xs font-semibold leading-relaxed text-slate-500">どの質問も医師選択済み根拠だけで回答します。</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-1.5">
          {FAQ.map((item, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => handleFreeQuestion(item.question)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                disabled={loading3}
              >
                <span>Q: {item.question}</span>
                <span className="text-gray-400">質問する</span>
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Free Q&A */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">✏️ 自由に質問する {aiSource === "gemini" && <Badge className="ml-1 bg-green-600 text-white text-xs">根拠確認済み</Badge>}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <Textarea placeholder="気になることを入力..." value={freeQuestion} onChange={(e) => setFreeQuestion(e.target.value)} rows={2} />
          <Button onClick={() => handleFreeQuestion()} className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-200 disabled:text-slate-600 disabled:opacity-100" disabled={!freeQuestion.trim() || loading3}>
            {loading3 ? "⏳ 回答を準備中..." : "質問する"}
          </Button>
          {freeAnswer && (
            <div className={`border rounded-lg p-3 space-y-2 ${freeAnswer.requiresDoctorReview ? "bg-blue-50 border-blue-200" : "bg-sky-50 border-sky-100"}`}>
              <p className="text-base font-semibold leading-relaxed text-blue-950">{freeAnswer.answer}</p>
              <div className="flex flex-wrap gap-1.5">
                {freeAnswer.safetyLabel && freeAnswer.safetyLabel !== "general" && (
                  <Badge className={`text-xs ${SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.color || "bg-gray-100"}`}>
                    {SAFETY_LABEL_MAP[freeAnswer.safetyLabel]?.label}
                  </Badge>
                )}
                {freeAnswer.templateReferences && freeAnswer.templateReferences.length > 0 ? (
                  <Badge className="bg-violet-100 text-violet-900 text-xs">施設テンプレ回答</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-700 text-xs">医師選択根拠のみ</Badge>
                )}
                {freeAnswer.requiresDoctorReview && !freeAnswer.templateReferences?.length && (
                  <Badge className="bg-red-600 text-white text-xs">🔴 医師確認</Badge>
                )}
                {!freeAnswer.requiresDoctorReview && freeAnswer.templateReferences?.length ? (
                  <Badge className="bg-transparent px-0 text-xs font-black text-violet-900 shadow-none hover:bg-transparent">✅ 施設テンプレ確認済み</Badge>
                ) : null}
              </div>
              {freeAnswer.evidenceReferences && freeAnswer.evidenceReferences.length > 0 && (
                <p className="text-xs font-semibold text-blue-800">
                  参照: {freeAnswer.evidenceReferences.join(" / ")}
                </p>
              )}
              {freeAnswer.templateReferences && freeAnswer.templateReferences.length > 0 && (
                <details className="rounded-lg border border-violet-100 bg-white/70 p-2">
                  <summary className="cursor-pointer text-xs font-semibold text-violet-900">使用した施設テンプレ</summary>
                  <div className="mt-2 space-y-1.5">
                    {freeAnswer.templateReferences.map((template) => (
                      <div key={template.templateId} className="text-xs leading-relaxed text-gray-700">
                        <p className="font-bold text-violet-900">{template.templateId}: {template.label}</p>
                        <p className="mt-1">{template.scope}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {freeAnswer.retrievedEvidence && freeAnswer.retrievedEvidence.length > 0 && (
                <details className="rounded-lg border border-blue-100 bg-white/70 p-2">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-700">引用に使った根拠</summary>
                  <div className="mt-2 space-y-1.5">
                    {freeAnswer.retrievedEvidence.map((item) => (
                      <div key={item.evidenceId} className="text-xs leading-relaxed text-gray-700">
                        <p><span className="font-bold text-blue-800">{item.evidenceId}</span>: {item.displayForFamily}</p>
                        <p className="mt-1 font-semibold text-gray-500">
                          {item.citation}
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-700 underline underline-offset-2">
                              出典元リンク
                            </a>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
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
        className="w-full bg-green-600 py-5 text-white hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100"
        disabled={!allAnswered}
      >
        📤 医師に回答を送信
      </Button>
      {!allAnswered && <p className="text-center text-xs text-gray-500">全ての理解度チェックに回答してください</p>}
    </div>
  );

  const renderScreen4 = () => (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-2xl font-black text-slate-950">医師サマリー</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">患者・家族が残した不安と質問だけを確認します。</p>
      </div>

      <Card className="border-orange-100 bg-white shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base text-orange-900">😰 患者・家族の不安</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {summary?.concerns.length ? (
            summary.concerns.map((item, i) => (
              <div key={i} className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm font-semibold leading-relaxed text-orange-950">
                {item}
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-500">未入力</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-white shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base text-blue-950">💬 患者・家族からの質問</CardTitle>
          <p className="text-xs font-semibold leading-relaxed text-slate-500">回答内容を見て、必要なものだけ診察室で補足してください。</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {summary?.familyQuestions.length ? (
            summary.familyQuestions.map((item, i) => (
              <div key={i} className="rounded-2xl border border-blue-100 bg-blue-50 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black leading-relaxed text-blue-950">Q. {item.question}</p>
                  {item.needsDoctorFollowUp && <Badge className="shrink-0 bg-red-600 text-white text-xs">医師補足</Badge>}
                </div>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">{item.answer}</p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-500">質問はありません</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base text-slate-950">eConsent</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <Button onClick={() => setConsentSent(true)} className="w-full bg-blue-600 py-5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-100 disabled:text-blue-800 disabled:opacity-100" disabled={consentSent}>
            {consentSent ? "✅ 送信完了" : "📤 eConsent送信"}
          </Button>
          <Button onClick={() => setRecorded(true)} className="w-full bg-green-600 py-5 text-sm font-bold text-white hover:bg-green-700 disabled:bg-green-100 disabled:text-green-800 disabled:opacity-100" disabled={recorded}>
            {recorded ? "✅ 説明完了を記録しました" : "📝 説明完了として記録"}
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-lg px-3 py-5">
        {/* Step Navigation */}
        <nav className="grid grid-cols-2 gap-3 rounded-t-[28px] bg-slate-100 pb-5">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <button
              key={s}
              onClick={() => goToStep(s)}
              className={`rounded-[28px] border px-4 py-5 text-center text-2xl font-black shadow-sm transition-colors ${
                s === step
                  ? "border-slate-950 bg-slate-950 text-white"
                  : s < step
                  ? "border-slate-200 bg-white text-slate-800"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {stepLabels[s - 1]}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="pb-8">
          {screens[step]()}
        </main>

        <footer className="px-2 pb-4 text-center">
          <p className="text-[11px] leading-relaxed text-slate-500">
            デモデータのみ。実在患者の個人情報・医療情報は使用していません。最終説明・治療判断・同意確認は資格を持つ医師が行います。
          </p>
        </footer>
      </div>
    </div>
  );
}
