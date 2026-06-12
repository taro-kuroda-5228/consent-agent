# Consent Agent ブラッシュアッププラン — 実臨床対応 × DevOps × AI Agent Hackathon 2026

> 作成: 2026-06-12(v2: ターゲット大会確定により改訂)。現状コード調査(src全域・supabase migrations・既存plan 3本)、
> exbrain-vault の意思決定(2026-05-29 Gemini Omni中心/Veo不採用、AI-mediated consent)、
> および DevOps × AI Agent Hackathon 2026 の公開要件に基づく。

## 0. ターゲット大会(確定)

**DevOps × AI Agent Hackathon 2026**(Findy主催・Google Cloud協賛)

- **提出締切: 2026-07-10(金)** ← 本日から残り4週間
- ファイナリスト発表: 7/30(木)、決勝: 8/19(水) Google渋谷オフィス
- チーム: 1〜5名、日本在住18歳以上
- 賞: 総額200万円(最優秀50万 / 優秀30万×3 / 特別10万×6)
- **必須要件**:
  - Google Cloud アプリケーション実行プロダクト 1つ以上(Cloud Run / GKE / App Engine / GCE / Cloud Functions 等)
  - Google Cloud AI技術 1つ以上(Gemini API / Gemini Enterprise Agent Platform / ADK / Gemma / Imagen / Speech-to-Text / Text-to-Speech 等)
- **審査3軸**:
  - **つくる**: エージェントとしての必然性、自律的に判断しタスクを実行する設計
  - **まわす**: CI/CD等のDevOpsフロー構築、**AIの継続的改善サイクルの実装**
  - **とどける**: Google Cloudへのデプロイ、スケーラブルな環境での本番品質

### 現状とのギャップ(要件レベル)

- 実行プロダクト: 現在 Vercel → **Cloud Run への移行が必須**(Supabase併用は要件違反ではない)
- AI技術: Gemini API 使用済みで充足。音声に Cloud Text-to-Speech / Speech-to-Text を使えば加点要素として積める
- まわす: **CI/CDも評価パイプラインも現状ゼロ** — ここが最大の伸びしろであり、他チームと差がつく軸

## 1. 勝ち筋 — 審査3軸への正面回答

### つくる: 「AI-mediated consent エージェント」(方針確定)

AIが説明 → 質問応答 → 理解確認 → **同意意思の記録**までを自律実行し、
**医師が選択した情報ソース内で回答できなかったものだけ**を医師に返す。

- セッション終端で AI が自律判定: `consent_ready` / `needs_physician_followup`
- エージェントの必然性: 緊急手術の現場では医師が物理的に説明に立てない。人手の代替ではなく「医師不在の時間帯に家族と病院をつなぐ自律エージェント」という必然性を打ち出す
- 自律的判断の実装ポイント: 根拠選択済み情報での回答可否判定、safety triage、エスカレーション判定、理解度評価 — すべて既存コードに種がある
- 構成をエージェント分解して提示(ADK採用を検討): ①説明エージェント ②根拠検証エージェント(引用照合) ③理解評価エージェント ④エスカレーション判定 — 採用可否は Week 2 末に判断、無理に入れて壊さない

### まわす: 「医療AIの継続的品質保証パイプライン」(最大の差別化)

医療AIこそ「まわす」が必須、という物語がこのプロダクトでは嘘なく語れる。

1. **Grounding 評価スイート**: ゴールデンQAデータセット(家族質問×選択根拠×期待挙動)に対し、(a) 引用spanが根拠原文に実在するかの機械照合、(b) LLM-as-judge による忠実性評価、(c) 回答不能時に正しくエスカレーションするかの検証 — を自動実行
2. **CIゲート化**: PR毎に unit + grounding eval を実行し、ハルシネーション回帰をマージ前にブロック
3. **改善サイクル**: 本番の `session_events`(qa_answered / safety_escalation)から匿名の失敗ケースを評価データセットに還流 → プロンプト/検索の改善 → eval で検証 → 再デプロイ
4. **CD**: GitHub Actions → Cloud Build → Cloud Run(staging→prod、ヘルスチェック+ロールバック)
5. **可観測性**: Cloud Logging / Cloud Monitoring でモデル呼び出し・レイテンシ・エスカレーション率・フォールバック発火率をダッシュボード化

### とどける: Cloud Run 本番品質

- Next.js standalone + Dockerfile で Cloud Run へ。Secret Manager でキー管理、min-instances で初回レイテンシ対策
- 家族アクセスは QR + 短命トークンリンク(スケーラビリティと安全性の両立を示す)
- deterministic fallback 3段(Gemini→キーワード合成→静的)でデモ堅牢性を確保

## 2. 現状評価 — 5要件に対する実装状況

| 要件 | 状態 | 根拠 |
|---|---|---|
| 1. 医師が根拠資料を選択 | ◎ ほぼ実装済み | PDF/テキスト/URL取込(`api/evidence/upload`、PHIブロッカー付き)、PubMed実検索、施設テンプレ、根拠カバレッジチェック |
| 2. AIが資料ベースで説明 | ○ 片肺 | `generateExplanation()` は選択根拠限定で動くが、`family/[caseId]/page.tsx` は**静的 mock-explanation.json を表示**。音声/動画は storyboard テキストのみ |
| 3. ハレーション無きQ&A | ○ コアあり | source-bounded agentic search + safety triage 実装済み。ただし引用spanの機械検証なし、retrieval はキーワードマッチ、ストリーミングなし |
| 4. 理解度・同意チェック | △ 半分 | 採点ロジック(clear/partial/unsafe)はあるが設問は静的JSON。**同意意思は入力できても永続化されない** |
| 5. 病院に記録 | ✗ 未稼働 | Supabase スキーマ+RLS+リポジトリは完成済みだが UI が in-memory のまま。認証なし。review/export API は UI 未接続(`sendConsent()` は toast のみ) |

## 3. 週次実行計画(締切 7/10 逆算)

### Week 1(6/12〜6/19): 配線を本物に + とどける基盤

| # | タスク | 対象 |
|---|---|---|
| W1-1 | 家族画面のセッション実データ化(mock-explanation.json 排除、`GET /api/sessions/[id]` 新設) | `family/[caseId]/page.tsx`, `qa/page.tsx` |
| W1-2 | 医師サマリー実生成(`generateDoctorSummary()` API化、summaryData.json 排除) | `doctor/[caseId]/summary/page.tsx` |
| W1-3 | 同意意思の永続化 + `consent_ready`/`needs_physician_followup` 判定フィールド | `qa-handler.ts`, migration 追加 |
| W1-4 | review/export API の UI 接続(toast スタブ排除、export JSON ダウンロード) | `doctor/.../summary` |
| W1-5 | Supabase を既定永続化に + 認証(医師=magic link、家族=QR+短命トークン) | `default-consent-session-repository.ts`, 新 auth |
| W1-6 | **Cloud Run 最小デプロイ**(Dockerfile, Secret Manager, staging環境) | 新 `Dockerfile`, `cloudbuild.yaml` |
| W1-7 | **CI 雛形**: GitHub Actions で test/lint/build + Cloud Run staging 自動デプロイ | 新 `.github/workflows/` |

### Week 2(6/19〜6/26): まわすの核 + 回答品質

| # | タスク | 内容 |
|---|---|---|
| W2-1 | SDK移行: `@google/generative-ai`(旧世代)→ `@google/genai`。Vertex AI 切替フラグ | `lib/gemini.ts` |
| W2-2 | **引用の機械検証**: `supportingSpans` を根拠原文と substring/正規化照合、不一致は破棄+エスカレーション。UI に「検証済み引用」バッジ | `gemini.ts`, `qa-handler.ts` |
| W2-3 | **Grounding 評価スイート**: ゴールデンQAデータセット(30〜50問)+ LLM-as-judge + 照合チェック。`npm run eval` | 新 `eval/` |
| W2-4 | 評価を CI ゲート化(回帰ブロック)+ 結果サマリーを PR コメント | `.github/workflows/` |
| W2-5 | ストリーミング応答(explain/qa) | API routes, クライアント |
| W2-6 | 医師リアルタイムダッシュボード(Supabase Realtime、緊急介入/再説明/通常の3分類、ポーリングfallback) | `lib/realtime/`, `doctor/.../summary` |
| W2-7 | ADK 採用可否の判断(エージェント分解が2日で安全に載るか試作) | spike |

### Week 3(6/26〜7/3): つくるの仕上げ(音声 + 自律判定)

| # | タスク | 内容 |
|---|---|---|
| W3-1 | 説明カードの音声ナレーション(**Cloud Text-to-Speech** または Gemini ネイティブTTS。前者はAI技術要件の積み増しになる) | 説明カードUI |
| W3-2 | 音声質問: push-to-talk → **Speech-to-Text** → 既存 `/api/qa` → TTS 回答。Gemini Live API は決勝進出後の上振れ枠に送る | `family/.../qa` |
| W3-3 | 理解確認のAI評価: 自由回答を Gemini で評価(キーワード0.65閾値は fallback に降格)、設問をセッション内容から動的生成 | `ai-consent-session.ts` |
| W3-4 | `consent_ready` 自律判定の完成: 理解評価+未解決質問+意思確認から判定し、医師には unresolved のみ返す | `qa-handler.ts`, summary |
| W3-5 | 視覚補助: 事前承認済み解剖シェーマ(静的アセット)をカードへ紐付け(Veo不採用決定に準拠) | `src/data/`, カードUI |
| W3-6 | E2E テスト(Playwright): 医師→家族→AI判定→医師レビュー→export を1本 | 新 `e2e/` |

### Week 4(7/3〜7/10): 提出梱包

1. 本番 Cloud Run 環境の品質確認(レイテンシ、min-instances、監視ダッシュボード、ロールバック手順)
2. デモ脚本 v2: 時間軸ストーリー「21:40 搬送 → 医師は手術準備で説明不能 → 22:10 家族到着、QRでAI説明開始 → 音声で質問 → 理解確認 → consent_ready → 医師が手術前に1分でレビュー」(`docs/hackathon-demo-script.md` 更新)
3. Zenn記事/提出資料: 課題発見(医師としての実体験)/ つくる(自律判定の設計)/ まわす(eval パイプラインのスクショ・回帰ブロックの実例)/ とどける(アーキテクチャ図)
4. デモ動画撮影、README 更新、最終 eval 全パス確認
5. バッファ(全タスクの遅延吸収)

### 決勝進出後(7/30〜8/19)の上振れ枠

Gemini Live API リアルタイム音声対話 / pgvector + gemini-embedding retrieval / 多言語対応 / ADK 本格化(未採用の場合)

## 4. 4週間に入れないもの(意図的スコープ外)

- pgvector 埋め込み検索(現キーワード+引用機械検証で demo 品質は担保できる)
- 多言語対応、Gemini Live API(決勝枠へ)
- PDF export 整形(JSON export を先に確実に)
- 施設管理画面(admin)— 実臨床フェーズへ

## 5. 実臨床レイヤ(ハッカソン後〜並行可)

1. **監査強化**: export hash、audit_events の不変性検証、カルテ添付用PDF
2. **施設管理画面**: 施設文書・回答テンプレ・承認済み根拠の管理(admin ロール)
3. **臨床評価**: 模擬家族(非医療者)ユーザーテストで理解度スコア・所要時間を計測 — Zenn記事と病院提案の両方のエビデンスになるため、可能なら Week 4 前倒し
4. **規制・コンプラ**: 「同意意思の確認と記録 + 医師最終追認」の表現で統一(署名済み同意書の代替とは主張しない)。SaMD該当性整理、倫理委員会向け資料、PHI境界(匿名のみ)の維持
5. **病院ランタイム**: Repository 境界を活かし Cloud SQL/AlloyDB or オンプレ Postgres へ移行可能なことを文書+最小検証で提示

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| 4週間でスコープ過大 | Week 1 の配線が最優先。W2-2/W2-3(引用検証+eval)は審査の核なので死守。音声は W3 で間に合わなければ TTS のみに縮退 |
| Cloud Run 移行で Next.js 16 の挙動差 | Week 1 で最小デプロイを先に通し、以降 staging で常時検証(`node_modules/next/dist/docs/` を参照) |
| Gemini/Supabase 当日障害 | deterministic fallback 3段を維持。デモは録画も用意 |
| 「AIが同意を取る」表現の法的リスク | 「同意意思の確認と記録 + 医師最終追認」に統一 |
| Supabase が主役に見える | ピッチは Gemini=理解・対話・自律判定、Supabase=状態・監査。実行系は Cloud Run + Cloud Build で Google 色を担保 |
| 旧SDK陳腐化 | W2-1 で `@google/genai` へ移行 |

## 7. 参照

- [DevOps × AI Agent Hackathon 2026 (Google Cloud 公式ブログ)](https://cloud.google.com/blog/ja/products/ai-machine-learning/devops-ai-agent-hackathon-2026)
- [応募ページ (Findy/Notion)](https://findy.notion.site/devops-ai-agent-hackathon-2026)
- [プレスリリース (PR TIMES)](https://prtimes.jp/main/html/rd/p/000000228.000045379.html)
- vault 決定: `wiki/decisions/2026-05-29-consent-agent-gemini-omni-not-veo.md`, `2026-05-29-consent-agent-ai-mediated-consent.md`
