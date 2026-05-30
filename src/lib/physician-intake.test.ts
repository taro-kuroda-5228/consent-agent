import { describe, expect, it } from "vitest";
import { PHYSICIAN_QUICK_CASES, getPhysicianQuickCase, resolveExplanationStartCase } from "./physician-intake";

describe("physician quick intake presets", () => {
  it("offers a one-tap acute type A dissection preset with all required explanation inputs", () => {
    const preset = getPhysicianQuickCase("acute-type-a-dissection");

    expect(preset.label).toBe("急性A型解離・緊急手術");
    expect(preset.age).toBe("62");
    expect(preset.sex).toBe("男性");
    expect(preset.diagnosis).toContain("Stanford A型");
    expect(preset.plannedSurgery).toContain("上行大動脈");
    expect(preset.urgency).toContain("至急");
    expect(preset.risks).toEqual(expect.arrayContaining(["死亡", "脳梗塞", "出血", "腎不全", "再手術"]));
    expect(preset.notes).toContain("平易");
  });

  it("keeps the default visible choices short enough for a busy physician", () => {
    expect(PHYSICIAN_QUICK_CASES.length).toBeLessThanOrEqual(3);
    expect(PHYSICIAN_QUICK_CASES.every((preset) => preset.label.length <= 16)).toBe(true);
  });

  it("falls back to the acute dissection demo preset when starting family explanation with empty intake", () => {
    const resolved = resolveExplanationStartCase({
      age: "",
      sex: "",
      diagnosis: "",
      urgency: "",
      plannedSurgery: "",
      purpose: "",
      cardiopulmonaryBypass: false,
      transfusion: "",
      risks: [],
      notes: "",
    });

    expect(resolved.diagnosis).toContain("Stanford A型");
    expect(resolved.plannedSurgery).toContain("上行大動脈");
    expect(resolved.usedFallbackPreset).toBe(true);
  });
});
