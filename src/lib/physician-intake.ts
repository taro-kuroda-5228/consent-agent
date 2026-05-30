export interface PhysicianQuickCase {
  id: string;
  label: string;
  description: string;
  age: string;
  sex: string;
  diagnosis: string;
  urgency: string;
  plannedSurgery: string;
  purpose: string;
  cardiopulmonaryBypass: boolean;
  transfusion: string;
  risks: string[];
  notes: string;
}

export const PHYSICIAN_QUICK_CASES: PhysicianQuickCase[] = [
  {
    id: "acute-type-a-dissection",
    label: "急性A型解離・緊急手術",
    description: "家族説明デモ用の標準症例を一括入力",
    age: "62",
    sex: "男性",
    diagnosis: "Stanford A型急性大動脈解離",
    urgency: "至急手術",
    plannedSurgery: "緊急上行大動脈人工血管置換術 ± ヘミアーチ置換術",
    purpose: "裂けた大動脈の部分を人工血管に置換し、破裂や心タンポナーデを防ぐ。",
    cardiopulmonaryBypass: true,
    transfusion: "必要な可能性大",
    risks: ["死亡", "脳梗塞", "出血", "腎不全", "再手術"],
    notes: "ご家族の不安が強いため、短く平易な説明を優先する。",
  },
];

export function getPhysicianQuickCase(id: string): PhysicianQuickCase {
  const preset = PHYSICIAN_QUICK_CASES.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown physician quick case: ${id}`);
  }
  return preset;
}

export type ExplanationStartCase = PhysicianQuickCase & {
  usedFallbackPreset: boolean;
};

export function resolveExplanationStartCase(draft: Omit<PhysicianQuickCase, "id" | "label" | "description">): ExplanationStartCase {
  const hasMinimumInput = draft.diagnosis.trim() && draft.plannedSurgery.trim();
  if (hasMinimumInput) {
    return {
      id: "custom-physician-input",
      label: "医師入力",
      description: "医師が入力した内容",
      ...draft,
      usedFallbackPreset: false,
    };
  }

  return {
    ...PHYSICIAN_QUICK_CASES[0],
    usedFallbackPreset: true,
  };
}
