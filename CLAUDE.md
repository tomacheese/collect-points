# collect-points

Puppeteer を使用してポイントサイト（PointTown、ECNavi）のポイント収集を自動化するプロジェクト。

## 重要: このプロジェクトの目的

**このプロジェクトの目的はポイントを「収集」すること。** 単なるページ遷移ではなく、実際にポイントが獲得できるインタラクションを実装する必要がある。

## 新機能実装時の注意事項

### 基本原則

1. **URL のリダイレクト確認だけでは不十分** - ページに遷移して待機するだけではポイントは取得できない
2. **実際にポイントが取得できるインタラクションを実装する** - ボタンクリック、ゲームプレイ、広告視聴など
3. **動作確認時はポイントの増減を確認する** - 操作前後でポイント数を比較して、実際に獲得できているか検証する

単に `page.goto()` して `sleep()` するだけの実装は意味がない。各ゲームの仕組みを理解し、ポイント獲得に必要な操作を特定・実装すること。

### 新しいゲーム/機能の調査手順

1. **ブラウザで実際にアクセスしてゲームの流れを確認する**
   - どのボタンをクリックすると開始するか
   - 広告視聴が必要か
   - どのような操作でポイントが獲得できるか

2. **必要なセレクターを特定する**
   - 開始ボタン、回答ボタン、閉じるボタンなど
   - `:has-text()` セレクターは Puppeteer で動作しないため、実際のクラス名や属性を使用

3. **実装パターンを選択する**（下記参照）

4. **動作確認でポイント増減を確認する**

## 実装パターン

### パターン 1: 広告視聴型

多くのゲームは広告視聴後にポイント/スタンプが獲得できる。

```typescript
async gameWithAd(page: Page): Promise<void> {
  await page.goto('https://example.com/game/redirect', {
    waitUntil: 'networkidle2',
  })

  // 開始ボタンをクリック
  const startButton = await page
    .waitForSelector('button.start-button', { timeout: 5000 })
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  // 広告視聴
  await this.watchAdIfExists(page)

  await sleep(5000)
}
```

### パターン 2: クイズ/回答型

クイズに回答してポイントを獲得する。正解でなくても参加ポイントが得られることが多い。

```typescript
async quizGame(page: Page): Promise<void> {
  await page.goto('https://example.com/quiz', {
    waitUntil: 'networkidle2',
  })

  // クイズに回答（最大 N 問）
  for (let i = 0; i < 10; i++) {
    const answerButtons = await page.$$('button.answer-choice')
    if (answerButtons.length === 0) break

    // ランダムに回答を選択
    const randomIndex = Math.floor(Math.random() * answerButtons.length)
    await answerButtons[randomIndex].click()
    await sleep(2000)

    // 次の問題へ
    const nextButton = await page.$('button.next').catch(() => null)
    if (nextButton) {
      await nextButton.click()
      await sleep(2000)
    }
  }
}
```

### パターン 3: スタンプ収集型

訪問やゲーム参加でスタンプを集め、一定数でくじが引ける。

```typescript
async stampGame(page: Page): Promise<void> {
  await page.goto('https://example.com/stamp-game', {
    waitUntil: 'networkidle2',
  })

  // 挑戦ボタンをクリック
  const challengeButton = await page
    .waitForSelector('button.challenge', { timeout: 5000 })
    .catch(() => null)

  if (challengeButton) {
    await challengeButton.click()
    await sleep(3000)
  }

  // 広告視聴（必要な場合）
  await this.watchAdIfExists(page)

  // ゲーム画面で待機（参加するだけでスタンプが貯まる場合）
  await sleep(10_000)
}
```

### 共通: 広告視聴処理

```typescript
private async watchAdIfExists(page: Page): Promise<void> {
  const adButton = await page
    .waitForSelector(
      'button:has-text("広告を再生"), button:has-text("広告を見て"), button:has-text("動画を見る")',
      { timeout: 3000 }
    )
    .catch(() => null)

  if (adButton) {
    await adButton.click()
    this.logger.info('広告再生開始、30秒待機')
    await sleep(30_000) // 広告は通常 15-30 秒

    const closeButton = await page
      .waitForSelector(
        'button:has-text("閉じる"), button:has-text("スキップ"), button[class*="close"]',
        { timeout: 10_000 }
      )
      .catch(() => null)

    if (closeButton) {
      await closeButton.click()
      await sleep(2000)
    }
  }
}
```

## 自動化が困難なゲーム

以下のようなゲームは完全な自動化が困難：

1. **画像認識が必要なゲーム** - まちがい探しで実際に違いを見つける必要がある場合
2. **タイミングが重要なゲーム** - クレーンゲームで適切なタイミングで操作する必要がある場合
3. **CAPTCHA/人間認証** - ボット検出がある場合

ただし、これらのゲームでも「参加するだけでスタンプが貯まる」場合は、広告視聴 + 参加の形で部分的に自動化可能。

## プロジェクト構成

- `src/providers/` - 各ポイントサイトのクローラー実装
  - `pointtown.ts` - PointTown クローラー
  - `ecnavi.ts` - ECNavi クローラー
- `src/base-provider.ts` - クローラーの基底クラス
- `src/configuration.ts` - 設定ファイルの読み込み
- `src/functions.ts` - 共通ユーティリティ関数
- `data/config.json` - 認証情報などの設定（Git 管理外）
- `.claude/commands/` - Claude Code 用スキル
  - `detect-changes.md` - 新規機能・変更検出
  - `investigate-errors.md` - エラー原因調査
  - `implement-approved.md` - Approved Issue 実装
- `.claude/hooks/` - Claude Code フック
  - `check-branch-status.sh` - マージ済みブランチでの作業を防止
  - `pre-commit-check.sh` - git commit/push 前のブランチ状態チェック
- `scripts/` - crontab 用スクリプト

## 運用フロー

このプロジェクトは Claude Code を用いた自動運用を行う。

### 1. 新規機能・既存機能の変更検出（週1回）

**スケジュール**: 毎週月曜 10:00

**処理内容**:
1. PointTown と ECNavi のサイトを Chrome で探索
2. CLAUDE.md の実装済み機能一覧と比較
3. 新機能や変更を検出したら GitHub Issue を作成
   - ラベル: `enhancement` または `bug` + `Waiting review`
   - スクリーンショット添付必須
4. 既存 Issue（クローズ済み含む）と重複する場合は作成しない

**実行方法**:
```bash
./scripts/weekly-detect-changes.sh
# または
/detect-changes
```

### 2. エラー原因の調査（週5回）

**スケジュール**: 月曜・土曜以外の毎日 10:00（日・火・水・木・金）

**処理内容**:
1. `/data/logs/` 配下の新しいログファイルを確認
2. エラーパターン（ERROR, failed, timeout 等）を検索
3. エラーがあれば Chrome で再現確認・原因調査
4. GitHub Issue を作成
   - ラベル: `bug` + `Waiting review`
   - ログ、スクリーンショット添付
5. 確認済みログのタイムスタンプを記録（重複確認防止）

**実行方法**:
```bash
./scripts/investigate-errors.sh
# または
/investigate-errors
```

### 3. Approved Issue の実装（週1回）

**スケジュール**: 毎週土曜 10:00（または手動実行）

**処理内容**:
1. `Approved` ラベルの付いた Issue を取得
2. 各 Issue について:
   - ブランチ作成（`feat/issue-{番号}-{説明}` or `fix/issue-{番号}-{説明}`）
   - Chrome でサイト調査（必要に応じて）
   - 実装パターンに従って実装
   - Lint 確認
   - コミット・プッシュ
   - PR 作成（`Closes #{Issue番号}` を含める）

**実行方法**:
```bash
./scripts/implement-approved.sh
# または
/implement-approved
```

### 4. ブランチ/PR クリーンアップ（月1回）

**スケジュール**: 毎月1日 10:00

**処理内容**:
1. リモートの最新情報を取得（`git fetch --all --prune`）
2. マージ済みのローカルブランチを削除（master, main, develop は除外）
3. リモートで削除されたブランチ（`[gone]`）のローカル参照を削除
4. 30日以上更新がない Open な PR を報告

**実行方法**:
```bash
./scripts/cleanup-branches.sh
```

### GitHub Issue ラベルの意味

| ラベル | 意味 |
|--------|------|
| `enhancement` | 新機能追加 |
| `bug` | バグ・不具合 |
| `Waiting review` | レビュー待ち（自動作成直後）|
| `Approved` | 実装承認済み（実装対象）|

### crontab 設定例

```crontab
# 週次: 新規機能・変更検出（毎週月曜 10:00）
0 10 * * 1 /home/tomachi/repos/collect-points/scripts/weekly-detect-changes.sh

# 週5回: エラー原因調査（月曜・土曜以外の 10:00）
0 10 * * 0,2-5 /home/tomachi/repos/collect-points/scripts/investigate-errors.sh

# 週次: Approved Issue 実装（毎週土曜 10:00）
0 10 * * 6 /home/tomachi/repos/collect-points/scripts/implement-approved.sh

# 月次: ブランチ/PR クリーンアップ（毎月1日 10:00）
0 10 1 * * /home/tomachi/repos/collect-points/scripts/cleanup-branches.sh
```

## 開発コマンド

```bash
npm run lint       # Lint チェック（prettier, eslint, tsc）
npm run fix        # 自動修正
npm run dev        # 開発実行
```

## Claude in Chrome を用いた動作確認の知見

### 基本方針

1. **セレクターの存在確認** → **実際のクリックテスト** の順で行う
2. JavaScript 実行 (`javascript_tool`) でセレクターの存在とクリックを行う
3. 座標ベースのクリックではなく、セレクターベースのクリックを使用する

### セレクター確認方法

```javascript
// セレクターの存在確認
const element = document.querySelector('セレクター');
({ exists: element ? true : false, href: element?.href });
```

```javascript
// セレクターでクリック
const element = document.querySelector('セレクター');
if (element) {
  element.click();
  'Clicked';
} else {
  'Not found';
}
```

### target="_blank" リンクの注意点

`target="_blank"` のリンクを JavaScript の `element.click()` でクリックしても、ブラウザのセキュリティ制約により新規タブは開かない。Puppeteer では `getNewTabPage()` 関数でユーザークリックをシミュレートするため、この問題は発生しない。

Claude in Chrome での動作確認時は、セレクターの存在確認のみで十分。

### ページ読み込み待機

ページ遷移後は `wait` アクションで 2〜3 秒待機してから操作を行う。

```javascript
// navigation 後
await wait(2); // 2秒待機
await screenshot(); // 状態確認
```

### ポイント変動の確認

操作前後でポイントを確認し、正しく動作しているか検証する。

- PointTown: ヘッダー右上の `pt` 表示
- ECNavi: ヘッダー右上の `pts.` 表示

### ECNavi 実装済み機能

| 機能 | 実装パターン | 備考 |
|------|-------------|------|
| `entryLottery` | ボタンクリック | 宝くじエントリー |
| `gesoten` | 新規タブ + ガチャ | ゲソてんガチャ |
| `chirashi` | 新規タブ | チラシ閲覧 |
| `chinju` | クイズ回答 | 珍獣レッスン |
| `quiz` | クイズ回答 | 今日のクイズ（ヒントページから回答検索）|
| `divination` | ボタンクリック | 占い 3 種（星座/タロット/おみくじ）|
| `fishing` | ボタンクリック | 釣りパンダガチャ |
| `choice` | ボタンクリック | 二択アンケート |
| `news` | 記事閲覧 + リアクション | ニュース記事閲覧 |
| `garapon` | 新規タブ | ガラポン広告閲覧 |
| `doron` | 新規タブ | たぬきときつねでドロン |
| `ticketingLottery` | ボタンクリック | 宝くじチケット一括使用 |
| `fund` | 新規タブ | クリック募金 |
| `natsupoi` | 広告視聴型 | ナツポイ |
| `spotdiffBox` | 広告視聴型 | まちがい探し |
| `languageTravel` | クイズ回答型 | 語学トラベル |
| `brainExerciseGame` | 広告視聴型 | 頭の体操ゲーム |
| `easyGame` | 広告視聴型 | かんたんゲーム |
| `brainTraining` | クイズ回答型 | 脳トレクイズ |
| `vegetable` | 操作型 | ポイント畑（クレーンゲーム）|
| `chocoRead` | ページめくり | ちょこ読み（雑誌閲覧）|

### PointTown 実装済み機能

| 機能 | 実装パターン | 備考 |
|------|-------------|------|
| `loginBonus` | ボタンクリック | ログインボーナス |
| `triangleLot` | 三角くじ | 6 ページで三角くじを引く |
| `pointQ` | クイズ回答型 | ポイント Q（回答を JSON 保存）|
| `mailCheck` | メール確認 | ポイントメールボックス |
| `pointChance` | 新規タブ | ポイントチャンス（モニター）|
| `competition` | ボタンクリック | ポイント争奪戦 |
| `easyGame` | ボタンクリック | かんたんゲーム |
| `gesoten` | 新規タブ | ゲソてん |
| `news` | 記事閲覧 | ニュース閲覧 |
| `questionnaire` | 回答選択 | アンケート |
| `gacha` | スマホエミュレート | ガチャ |
| `omikuji` | スマホエミュレート | おみくじ |
| `horoscope` | スマホエミュレート | 星座占い |
| `brainTraining` | クイズ回答型 | 脳トレクイズ |
| `nazotore` | 広告視聴 + クイズ | 今夜はナゾトレ |
| `spotdiff` | 広告視聴型 | まちがい探し |
| `puzzle` | 広告視聴型 | クラッシュアイス |
| `sugoroku` | 広告視聴型 | たびろく（すごろく）|
| `dropgame` | 広告視聴型 | ふるふるパニック |
| `cmkuji` | 広告視聴型 | CM くじ |
| `movieDeCoin` | 広告視聴型 | 動画でコイン（時間帯別最大 3 回/日）|

### ECNavi 固有のセレクター

| 機能 | セレクター | 備考 |
|------|-----------|------|
| `entryLottery` | `p.btn_entry a` | 宝くじエントリー |
| `chirashi` | `a.chirashi_link` | チラシページへのリンク |
| `chinju` | `a.chinju-lesson-question__link` | 珍獣レッスン |
| `quiz` | `p.todays-quiz__text`, `ul.choices__list button` | 今日のクイズ |
| `divination` | `ul.western-astrology-list button`, `ul.draw-tarot button`, `button.draw-omikuji__button` | 占い系 |
| `choice` | `ul.answer_botton button` | 二択アンケート |
| `fishing` | `#home .function button.gacha`, `#home .gacha div.scene_1 button.common` | 釣りパンダガチャ |
| `news` | `li.article-latest-item a.article-latest-item__link`, `button.article-reaction__feeling-button` | ニュース記事＋リアクション |
| `doron` | `ul.character-tanuki a`, `ul.character-kitsune a` | たぬきときつねでドロン |
| `fund` | `ul.click-fund-contents li:nth-child(1) a`, `ul.click-fund-contents li:nth-child(2) a` | クリック募金 |

### PointTown 固有のセレクター

| 機能 | セレクター/URL | 備考 |
|------|---------------|------|
| `loginBonus` | `a[href="/login-bonus/"]` | ログインボーナスポップアップ |
| `triangleLot` | `button.link-sankaku-kuji` | 三角くじボタン |
| `stamprally` | `#link-stamp-sec` | スタンプラリー進捗確認 |
| `pointQ` | `form#js-quiz-form` | ポイント Q フォーム |

### 広告ポップアップへの対処

ECNavi では Google Rewarded Ads のポップアップ（「短い広告を見る」）が表示されることがある。

- URL に `#goog_rewarded` が含まれる場合がある
- ポップアップが表示された場合は、ページをリロードするか、URL から `#goog_rewarded` を除去して再アクセス

### トラブルシューティング

1. **セレクターが見つからない場合**
   - `read_page` で現在のページ構造を確認
   - `javascript_tool` で `document.querySelectorAll()` を使って類似セレクターを探索

2. **クリックしても反応がない場合**
   - `wait` で待機時間を延ばす
   - スクロールして要素を表示領域に入れてからクリック

3. **ログインが必要な場合**
   - まず `mypage` 等にアクセスしてログイン状態を確認
   - 未ログインの場合はログインページに遷移してログイン処理を行う
