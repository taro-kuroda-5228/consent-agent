import { defineConfig } from 'vitest/config';

// ユニットテスト用設定。eval/ 配下の grounding 評価は別ゲート
// （npm run eval / CI の grounding-eval ジョブ）として実行する。
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'eval/**'],
  },
});
