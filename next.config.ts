import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run などのコンテナ実行環境向けに最小ランタイムを生成する。
  // Vercel 上のデプロイには影響しない。
  output: "standalone",
};

export default nextConfig;
