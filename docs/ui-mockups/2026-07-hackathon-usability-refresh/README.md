# Consent Agent UI mockup — hackathon usability refresh

## Purpose

Googleハッカソン審査基準のうち、懸念点である **3. ユーザビリティ** を改善するためのUI専用モックです。

本番コードにはまだ適用していません。既存機能を壊さないため、まずこのHTMLで画面設計だけを確認します。

## Resolved source / existing workflow checked

Source-locked repo: `/Users/tarokuroda/projects/consent-agent`

Reviewed current UI/function entrypoints:

- `src/app/page.tsx`
  - 医師入力
  - 症例プリセット
  - PubMed自然文検索
  - PDF/URL資料追加
  - 根拠ON/OFF
  - 施設別テンプレ回答
  - 家族リンク/QR発行
  - 家族説明・理解確認・医師サマリーへの4ステップUI
- `src/app/family/[caseId]/page.tsx`
  - 家族向け動画/音声付き説明
  - 説明カード
  - 質問・理解確認画面への導線
- `src/app/family/[caseId]/qa/page.tsx`
  - よくある質問
  - 自由質問
  - 音声入力
  - 選択済み根拠限定Q&A
  - 理解度チェック
  - 不安/医師確認事項
  - 同意意思
  - 回答送信
- `docs/submission/2026-07-google-hackathon-final-package.md`
  - 審査向けストーリー、デモ手順、既存検証証跡
- `docs/submission/assets/cloud-run-live-ui-2026-07-03.png`
  - 現行UIのスクリーンショット

## Current usability problem

現行UIは機能が豊富な一方で、審査員・医師・家族が初見で見ると以下が起きやすいです。

- 1画面に医師向け詳細、根拠、施設テンプレ、患者家族向け説明導線が同時に出て文字量が多い
- 「次に押すべきボタン」はあるが、説明量に埋もれる
- AIエージェントの価値である「判断・根拠限定・医師への戻し」がUI上で一目では伝わりにくい
- 家族向けには、医学情報・安全注記・引用情報が近い階層に並び、直観的な流れが弱い

## Design direction

### Core principle

**機能はそのまま、主導線を4画面に圧縮する。**

1. 医師 30秒セットアップ
   - 症例プリセット
   - 根拠ロック
   - 家族リンク発行
   - PubMed/資料追加/施設テンプレは「必要時のみ」折りたたみ
2. 家族スマホ説明
   - まず3D動画/音声
   - 次に短い説明カード
   - 1画面1行動で「質問・理解確認へ」
3. 質問・理解確認
   - よくある質問 + 自由質問 + 音声
   - 回答は選択済み根拠だけ
   - 理解確認・不安・同意意思を1つの流れにする
4. 医師サマリー
   - AIが `consent_ready` / `needs_physician_followup` を判定
   - 未解決論点だけを医師に返す

## Must preserve in production implementation later

- AI説明生成
- 医師選択済み根拠だけに限定した家族Q&A
- PubMed検索 / URL・PDF資料追加
- 施設別テンプレ回答
- 引用スパン照合 / 出典照合済み表示
- 回答不能・個別予後・強い不安・理解不足の医師エスカレーション
- 理解度チェック
- 同意意思の記録
- 医師サマリー
- 「AIは最終同意を取得しない」「医師が最終確認する」安全境界

## How to open

```bash
open /Users/tarokuroda/projects/consent-agent/docs/ui-mockups/2026-07-hackathon-usability-refresh/index.html
```

## Verification performed for this mockup

- Self-contained HTML only; no production code changed
- Browser-rendered locally via `file://` and visually inspected
- Interactive screen switching / question answer state included
- No real patient data, credentials, private identifiers, or external send actions
- No legacy product/path residue in the created mockup files

## Suggested next step after review

If this direction is approved, implement the same information architecture in production React without changing backend/API contracts:

1. Add static tests that existing critical copy/actions still exist.
2. Refactor visual hierarchy in `src/app/page.tsx` and family routes.
3. Run `npm test`, `npm run eval`, `npm run lint`, `npm run build`.
4. Browser-smoke local full demo: doctor setup → family screen → Q&A → response submit → doctor summary.
5. Only after approval, deploy to Cloud Run and browser-smoke the live URL with non-PHI demo data.
