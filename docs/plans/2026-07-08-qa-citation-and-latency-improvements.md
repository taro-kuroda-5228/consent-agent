# QAセクション改善: 引用付き根拠の明示とレイテンシ根治 (2026-07-08)

提出(2026-07-10)直前のQAセクション仕上げ。目標は「医師が選択した資料のみから回答し、
引用付き根拠を明示する」UXの完成と、デモを壊しうるバグの除去。

## 実装した改善

### 1. 検証済み原文引用のUI表示（最重要のUXギャップ解消）
- バックエンドは以前から「AI抽出スパンを資料内の原文と機械照合し、不一致は棄却」する
  `citationVerification` と `supportingSpans` を返していたが、**UIはIDバッジしか表示していなかった**。
- 家族QAページ (`src/app/family/[caseId]/qa/page.tsx`) とメインデモ (`src/app/page.tsx`) の両方に
  「📖 回答の根拠（医師が選んだ資料の原文）」ブロックを追加。原文引用＋出典タイトル＋資料リンクを表示。
- 「✅ 出典照合済み（原文一致を機械検証）」バッジの条件を `rejectedSpans === 0` から
  `verifiedSpans > 0` に変更。表示される引用は常に検証済みのため誠実であり、
  棄却が発生したケース（=検証システムが仕事をした証拠）でもバッジが出る。

### 2. 決定論パスにも同じ機械検証レポートを付与
- `buildCitationVerificationForSupportingSpans()` を追加し、`generateQA` の決定論
  ショートサーキット/フォールバック結果にも `citationVerification` を付与。
  agentic / deterministic 両経路でUI表示と監査ログ(citationVerifiedCount)が統一された。

### 3. ソース全文キャッシュ（レイテンシ根治）
- 従来: 家族の質問ごとにガイドラインPDF(最大50MB)を再ダウンロード+再パース
  （フロントの20秒タイムアウトへの引き上げはこの対症療法だった）。
- `src/lib/source-url-evidence.ts` にインスタンス内キャッシュ（TTL 15分・最大8件・LRU）を実装。
  質問特化のチャンク選択(`selectRelevantEvidenceText`)は毎回実行するため回答品質は不変。
- 実測: JCSガイドライン初回質問 11.1秒 → 2問目以降 0.1秒。

### 4. 資料に依存しない質問の早期確定（fast path）
- 費用などの事務質問・施設テンプレ・個別予後・同意誘導は資料検索結果に依存しないため、
  `resolveNonEvidenceQAResult()` として共通化し、qa-handler で PDF再取得・Gemini呼び出しの
  前に確定するようにした。
- 併せて両synthesize関数の前段40行のコピペ重複と、到達不能な二重
  `isAdministrativeNonEvidenceQuestion` チェックを解消。施設テンプレ回答の
  `extractionMode` 不整合も統一。

### 5. デモキラーバグ修正: /api/explain クライアントタイムアウト 5秒 → 30秒
- ライブGeminiの説明生成は実測5〜12秒。5秒タイムアウトだと**成功したセッションを
  クライアントが破棄してモックにフォールバック**し、sessionId が null になり
  家族用リンク・監査ログ・根拠永続化のフロー全体が無言で機能停止していた。
- 家族QAページの fetch にも 25秒タイムアウトを追加（従来は無限待ち）。

## 検証
- `npm test` 215件 / `npm run eval` グラウンディングゲート / `tsc --noEmit` / eslint 全て成功
- Playwright実機: 医師デモ画面・家族リンク画面の両方で引用ブロックとバッジ表示を確認
- JCSガイドライン実URLでの2連続質問でキャッシュ効果を実測
