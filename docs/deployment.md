# Deployment

## Hackathon Vercel + Supabase demo

1. Create a Supabase project named `consent-agent-hackathon-demo`.
2. Apply migrations in `supabase/migrations/` and seed `supabase/seed.sql`.
3. Configure Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server routes only)
   - `GEMINI_API_KEY` or Vertex/Gemini config
   - `CONSENT_AGENT_DEMO_MODE=true`
4. Run:

```bash
npm run check:demo-env
npm run lint
npm run test -- --run
npm run build
```

5. Smoke path: `/sessions` → select/evidence explanation → understanding check/Q&A → `/approvals` → export.

## Cloud Run (ハッカソン提出要件: Google Cloud 実行プロダクト)

DevOps × AI Agent Hackathon 2026 は Google Cloud アプリケーション実行プロダクトの使用が必須。
本リポジトリは `output: "standalone"` + `Dockerfile` で Cloud Run にデプロイできる。

### 初回セットアップ（要 gcloud 認証）

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# シークレット登録（値は対話的に渡す。シェル履歴に残さない）
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | gcloud secrets create supabase-service-role-key --data-file=-
```

### デプロイ（ソースから Cloud Build 経由）

```bash
gcloud run deploy consent-agent \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=<url>,NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest
```

- `--min-instances 1`: 緊急説明ワークフローで初回レイテンシを避ける。
- `PORT` は Cloud Run が注入し、standalone `server.js` が尊重する。
- CI からの継続デプロイは `.github/workflows/ci.yml` のゲート（quality + grounding-eval）通過後に
  `gcloud run deploy` を行うジョブを追加する（Workload Identity Federation 推奨）。

### ローカルでのコンテナ検証

```bash
docker build -t consent-agent .
docker run --rm -p 8080:8080 --env-file .env.local consent-agent
```

## Safety gate

The public demo stores anonymous sample data only. Real PHI, signed consent, patient names, MRNs, emails, phone numbers, DICOM, and clinical notes are blocked from Vercel/Supabase demo operation.
