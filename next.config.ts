import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run などのコンテナ実行環境向けに最小ランタイムを生成する。
  // Vercel 上のデプロイには影響しない。
  output: "standalone",
  // Route Handlers are bundled by default. Keep the PDF parser external so
  // pdfjs can resolve its worker/runtime assets from node_modules in the
  // standalone Cloud Run image instead of looking for a missing .next chunk.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/evidence/upload": ["node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/api/qa": ["node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
