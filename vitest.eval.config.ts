import { defineConfig } from 'vitest/config';

// Grounding 評価ゲート用設定（npm run eval / CI grounding-eval ジョブ）。
export default defineConfig({
  test: {
    include: ['eval/**/*.test.ts'],
    // live Gemini のレート制限内に収めるため、evalファイルは直列実行する
    fileParallelism: false,
    testTimeout: 480_000,
  },
});
