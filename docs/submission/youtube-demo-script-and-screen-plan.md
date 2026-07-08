# Consent Agent YouTube demo script and screen plan

Purpose: ProtoPedia / Google hackathon submission video. Use anonymous demo data only. Do not show PHI/PII, private tokens, raw logs, or credentials.

Recommended length: 3:30–4:00. If the submission form prefers a shorter video, cut the optional architecture/GitHub sections first and keep the family URL workflow.

## Recording setup

### Browser windows / tabs to prepare

Use the production Cloud Run URL unless local recording is intentionally chosen:

- App root / doctor console: `https://consent-agent-dboupdketa-an.a.run.app/`
- Family page: open from the issued family link button after starting an explanation. Do **not** paste or publish the full tokenized URL in descriptions or documents.
- Doctor summary: after a family session is created, open `/doctor/<sessionId>/summary` in a doctor tab.
- Optional architecture visual: `docs/submission/assets/consent-agent-system-architecture.png`
- Optional CI visual: GitHub PR/Actions page showing `quality`, `smoke-e2e`, `grounding-eval`, and `GitGuardian` checks passed. Avoid showing private notifications or account menus.

### Screen layout

1. Main recording area: Chrome or Arc browser, 16:9, zoom 90–100%.
2. Family pages: use responsive/mobile viewport around iPhone/Pixel size, or a narrow browser window. The story is stronger if the family URL clearly looks like a phone flow.
3. Hide bookmarks bar if it contains private links.
4. Use only the built-in demo case: acute type A aortic dissection emergency surgery.
5. Before recording, create a fresh explanation session from the doctor console. Do not reuse a tokenized family URL from a previous recording.

### Key demo questions to type/click

Use these exact questions because they demonstrate the repaired direct-answer behavior and the safety boundary:

1. `脳梗塞のリスクについて教えてください。`
   - Expected: direct answer with `5%` / `95%信頼区間4〜7%`, `AAD-005`, and source-verification badge.
2. `手術の費用について教えてください。`
   - Expected: says the selected medical evidence does not directly answer cost/payment, routes to hospital billing/相談窓口/doctor review, no clinical-risk answer, no evidence reference.
3. Optional if time: `生きて帰れますか？`
   - Expected: warm doctor-review wording; no individual survival guarantee.

## Short opening message / video title

Recommended YouTube title:

> Consent Agent — 家族向けURLで救急手術説明をつなぐAI同意支援エージェント

Recommended one-line description:

> Acute type A aortic dissection demo using anonymous data: physician-selected evidence → family URL → evidence-bounded Q&A → understanding check → physician handoff summary on Cloud Run.

## Full timeline script

| Time | Screen to open / action | Narration script |
| --- | --- | --- |
| 0:00–0:12 | Title slide or app root top screen. Show `MedEvidence Consent Agent` / doctor console. | 「これは、救急手術の同意説明を支援する Consent Agent です。想定場面は、夜間に搬送された Stanford A型急性大動脈解離。医師は手術準備で長時間説明できず、家族は短時間で重大な判断を迫られます。」 |
| 0:12–0:30 | Doctor console `/`. Show `今回の説明`: diagnosis, planned surgery, urgency. | 「医師はまず、症例を30秒でセットアップします。ここでは匿名デモ症例として、A型急性大動脈解離、緊急人工血管置換、脳梗塞・出血・腎障害などの主要リスクを選択しています。」 |
| 0:30–0:50 | Open `医師向け詳細設定（根拠・施設テンプレ・資料追加）`, then `選択中の根拠 ... 件を確認・変更`. Show checked evidence cards such as `FAC-001`, `AAD-005`. | 「重要なのは、家族向けの説明とQAが、医師が選んだ根拠だけに限定されることです。施設資料、PubMed論文、ガイドライン資料を医師が確認してONにしたものだけが、回答の材料になります。」 |
| 0:50–1:05 | Click `家族説明を開始`. Wait for `家族用リンク発行済み`, QR, `📱 家族画面を開く`. | 「説明を開始すると、家族専用の短命リンクとQRコードが発行されます。家族は医師の端末ではなく、自分のスマートフォンで説明を読み、質問できます。」 |
| 1:05–1:25 | Open family URL in mobile-width window. Show `/family/<sessionId>?t=...` page header `家族向けご説明` and card `動画と音声付き説明`. Do not zoom into token. | 「これが家族向けに発行されたURLです。まず動画と音声で全体像を把握し、その後に質問と理解確認へ進みます。これは署名済み同意書ではなく、医師説明を補助する安全な中間ステップです。」 |
| 1:25–1:50 | Click `❓ 質問・理解確認へ進む`. Click quick question `脳梗塞のリスクについて教えてください。` | 「家族が『脳梗塞のリスク』を聞くと、エージェントは選択済み根拠だけを確認します。回答には根拠IDが付き、引用スパンが原文に実在するかを機械的に照合します。」 |
| 1:50–2:08 | Show answer area. Ensure badges `✅ 出典照合済み` and `参照: AAD-005` are visible. | 「ここでは、術後脳卒中5%、95%信頼区間4〜7%という、選択論文内に存在する数字だけを返します。数字を作ったり、選ばれていない文献から補ったりしません。」 |
| 2:08–2:30 | In free question textarea, type `手術の費用について教えてください。`, click `質問する`. | 「一方で、医療費や支払い制度のように、選択された医学資料で直接答えられない質問は、臨床リスク説明にすり替えません。」 |
| 2:30–2:48 | Show cost answer: direct-not-found wording, hospital office/doctor review, `医師確認が必要`, no evidence badge. | 「この場合は、費用について資料内に直接回答がないことを明示し、医事課・相談窓口・担当医に確認する質問として記録します。答えられないことを答えたふりにしないのが、このデモの安全境界です。」 |
| 2:48–3:10 | Fill understanding check. Use mostly correct answers. In concerns field, enter `生きて帰れるかが不安です。`. Choose `迷っているので、医師と話したい`. Click submit. | 「家族は理解度チェック、不安、現時点の気持ちを送信します。強い不安や個別予後の質問は、AIが完結させず、医師に戻します。」 |
| 3:10–3:35 | Open doctor summary `/doctor/<sessionId>/summary`. Show `AI判定`, `医師が対応すべき論点`, `理解済み`, `再説明が必要`, `家族の不安`, `医師が直接答えるべき質問`. | 「医師側には、家族が理解できたこと、再説明が必要なこと、不安、未解決質問だけがライブサマリーとして戻ります。医師は1分で論点を確認し、最終説明と同意確認を行えます。」 |
| 3:35–3:50 | Scroll to `医師レビューと記録`, show `説明支援記録をエクスポート（匿名JSON）`. | 「記録は匿名JSONとして残せますが、これは法的な署名済み同意書ではありません。最終確認は必ず医師が行います。」 |
| 3:50–4:05 | Optional: show architecture image or Cloud Run URL header only. | 「実行環境は Google Cloud Run。Gemini と選択済み根拠、監査・評価・CIゲートを組み合わせ、医療現場で使える保守的なAIエージェントとして設計しています。」 |
| 4:05–4:15 | Closing on app or title slide. | 「Consent Agent は、救急現場で医師が物理的に説明に立てない時間を、根拠限定・医師最終確認・監査可能な形で埋めるプロダクトです。」 |

## Minimum cut if time is tight

If the video must be around 2 minutes, keep only these shots:

1. Problem and doctor setup: 0:00–0:25
2. Evidence lock and family link generation: 0:25–0:50
3. Family URL video screen: 0:50–1:05
4. QA direct answer with `AAD-005`: 1:05–1:30
5. Cost question escalation: 1:30–1:45
6. Doctor summary: 1:45–2:10

Cut architecture and CI visuals; mention Cloud Run in narration only.

## Exact screen checklist for recording

### Scene A — doctor console

Open: `https://consent-agent-dboupdketa-an.a.run.app/`

Show these UI elements:

- `医師入力`
- `今回の説明`
- `Stanford A型急性大動脈解離`
- `緊急人工血管置換`
- `ただちに緊急手術が必要`
- `医師向け詳細設定（根拠・施設テンプレ・資料追加）`
- `家族説明で引用する根拠`
- `医師選択のみ引用`
- selected evidence cards such as `FAC-001`, `AAD-005`
- `家族説明を開始`

Do not spend time editing details unless a screen is blank. The point is speed and physician control.

### Scene B — family link issued

After clicking `家族説明を開始`, show:

- `家族用リンク発行済み`
- QR code
- `📋 リンクをコピー`
- `📱 家族画面を開く`

Narration point: the family URL is generated from the physician-approved session. Do not publish the full tokenized URL.

### Scene C — family explanation URL

Open from `📱 家族画面を開く`, ideally in mobile viewport.

Show:

- `家族向けご説明`
- `動画と音声付き説明`
- video player
- `動画を見たあと、分からないことは次の質問・理解確認でそのまま聞けます。`
- `❓ 質問・理解確認へ進む`

Narration point: this is the actual family-issued URL flow, not only a physician preview.

### Scene D — family Q&A direct answer

Open: `/family/<sessionId>/qa?t=<familyAccessToken>` from the button.

Click:

- `脳梗塞のリスクについて教えてください。`

Show:

- answer body including the stroke-risk statistic
- `✅ 出典照合済み（原文一致を機械検証）`
- `参照: AAD-005`

Narration point: source-bounded answer; no unsupported risk estimate.

### Scene E — family Q&A safe non-answer / administrative question

In `自由に質問する`, type:

```text
手術の費用について教えてください。
```

Show:

- direct statement that selected materials do not contain a cost/payment answer
- hospital office / consultation desk / doctor confirmation guidance
- `医師確認が必要`
- no `参照: ...` citation badge

Narration point: administrative/cost questions are not disguised as clinical evidence answers.

### Scene F — understanding check and concern handoff

Fill enough answers to enable submission. Recommended concern:

```text
生きて帰れるかが不安です。
```

Choose:

```text
迷っているので、医師と話したい
```

Show final family result:

- `担当医師が直接ご説明します` or `ご回答ありがとうございました`, depending on selected answers/intent
- note that this is not signed consent and physician final confirmation remains required

### Scene G — doctor summary

Open:

```text
/doctor/<sessionId>/summary
```

Show:

- `医師用サマリー`
- `ライブ更新中（5秒間隔）`
- `医師確認：必須`
- `AI判定: 医師フォローアップが必要` or `AI判定: 同意確認へ進められる状態`
- `医師が対応すべき論点`
- `理解済み`
- `再説明が必要`
- `家族の不安・自由記述`
- `医師が直接答えるべき質問`
- `家族からの質問ログ`
- `説明支援記録をエクスポート（匿名JSON）`

Narration point: the agent compresses the family interaction into a doctor-actionable handoff.

## What not to show / say

- Do not show real names, MRNs, chart IDs, hospital documents, personal emails, tokens, API keys, or raw Cloud logs.
- Do not claim the AI obtains legal consent.
- Do not claim the tool decides surgery indication.
- Do not say it is ready for real clinical use without hospital security/compliance review.
- Do not publish the full tokenized family URL in the YouTube description or ProtoPedia text.

## YouTube upload text draft

### Description

```text
Consent Agent is an AI-mediated consent support workflow for emergency surgery, demonstrated with anonymous demo data.

Scenario: acute type A aortic dissection emergency surgery.
Flow: physician setup → physician-selected evidence lock → family URL/QR → family video explanation → evidence-bounded Q&A → understanding check → physician handoff summary.

Safety boundary:
- AI does not obtain final legal consent.
- AI does not decide surgical indication.
- Family Q&A answers only from physician-selected evidence.
- Unsupported, administrative, or individual-prognosis questions are routed back to the physician.

Runtime: Google Cloud Run.
```

### Tags

```text
Google Cloud, Cloud Run, Gemini, AI Agent, healthcare, consent, medical AI, DevOps AI Agent Hackathon, MedEvidence, Consent Agent
```

## Final pre-upload checklist

- [ ] Recorded on fresh anonymous demo session.
- [ ] No tokenized family URL is readable for more than a moment; no token in description.
- [ ] No secrets, account menus, private bookmarks, PHI/PII, or raw logs visible.
- [ ] Family URL screen is shown, not only the doctor preview.
- [ ] Direct-answer QA shown with `AAD-005` and source verification.
- [ ] Cost/non-clinical question shown as doctor-review / no evidence reference.
- [ ] Doctor summary shown after family responses are submitted.
- [ ] Closing safety line says physician final confirmation is required.
