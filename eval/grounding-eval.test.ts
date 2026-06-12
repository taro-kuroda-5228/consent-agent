import { describe, expect, it } from 'vitest';
import { evaluateGoldenCase, extractPercentNumbers, loadGoldenCases } from './grounding-eval';

describe('grounding eval harness (meta tests)', () => {
  it('loads a non-trivial golden dataset', () => {
    const cases = loadGoldenCases();
    expect(cases.length).toBeGreaterThanOrEqual(10);
    const ids = cases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('detects failures instead of always passing (sabotaged case)', async () => {
    const sabotaged = {
      id: 'sabotage-unanswerable-expected-answerable',
      question: '脳梗塞のリスクについて教えてください',
      selectedEvidenceIds: [],
      expect: { answerable: true },
    };

    const result = await evaluateGoldenCase(sabotaged);
    expect(result.failures.map((failure) => failure.check)).toContain('expected-answerable');
  });

  it('detects forbidden strings in answers (sabotaged case)', async () => {
    const sabotaged = {
      id: 'sabotage-must-not-contain',
      question: '脳梗塞のリスクについて教えてください',
      selectedEvidenceIds: ['AAD-005'],
      expect: { mustNotContain: ['脳'] },
    };

    const result = await evaluateGoldenCase(sabotaged);
    expect(result.failures.map((failure) => failure.check)).toContain('must-not-contain');
  });

  it('extracts percent numbers including full-width variants', () => {
    expect(extractPercentNumbers('死亡率は7%、脳卒中は5％、脊髄障害は3 %でした')).toEqual(['7%', '5%', '3%']);
    expect(extractPercentNumbers('数値はありません')).toEqual([]);
  });
});
