import { describe, expect, it } from 'vitest';
import { formatEvalReport, runGroundingEval } from './grounding-eval';

// このテストは CI のマージゲート。失敗 = ハルシネーション回帰の可能性。
// GEMINI_API_KEY があれば live Gemini 経路、なければ決定論的経路を検証する。
describe('grounding eval gate', () => {
  it('every golden case satisfies its grounding properties', { timeout: 480_000 }, async () => {
    const report = await runGroundingEval();
    console.log(formatEvalReport(report));
    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(report.total);
  });
});
