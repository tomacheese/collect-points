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

- `src/core/` - コア機能
  - `base-crawler.ts` - クローラーの基底クラス（`Crawler` インターフェース、`BaseCrawler` 抽象クラス）
  - `configuration.ts` - 設定ファイルの読み込み
  - `discord.ts` - Discord 通知
  - `types.ts` - Context インターフェース定義（`CrawlerContext`、`EcNaviContext`、`PointTownContext`）
  - `index.ts` - バレルエクスポート
- `src/utils/` - ユーティリティ関数
  - `functions.ts` - 共通ユーティリティ関数
  - `version.ts` - バージョン情報取得（package.json から取得）
  - `index.ts` - バレルエクスポート
- `src/providers/` - 各ポイントサイトのクローラー実装
  - `pointtown/` - PointTown クローラー
    - `index.ts` - `PointTownCrawler` クラス
    - `contents/` - コンテンツメソッド（各ゲーム・機能の実装）
    - `contents/triangle-lot/` - 三角くじ関連メソッド
  - `ecnavi/` - ECNavi クローラー
    - `index.ts` - `EcNaviCrawler` クラス
    - `contents/` - コンテンツメソッド（各ゲーム・機能の実装）
    - `contents/lottery/` - 宝くじ関連メソッド
- `data/config.json` - 認証情報などの設定（Git 管理外）
- `.claude/commands/` - Claude Code 用スキル
  - `detect-changes.md` - 新規機能・変更検出
  - `investigate-errors.md` - エラー原因調査
  - `implement-approved.md` - Approved Issue 実装
- `.claude/hooks/` - Claude Code フック
  - `check-branch-status.sh` - マージ済みブランチでの作業を防止
  - `pre-commit-check.sh` - git commit/push 前のブランチ状態チェック
- `scripts/` - crontab 用スクリプト

## 診断情報機能

エラー発生時に詳細な診断情報を自動的に収集・保存する機能。エラー調査やデバッグの効率化を目的とする。

### 概要

`runMethod()` でメソッド実行中にエラーが発生すると、以下の診断情報を構造化 JSON 形式（gzip 圧縮）で自動保存する。

### 記録される情報

| カテゴリ | 内容 |
|---------|------|
| **基本情報** | タイムスタンプ、メソッド名、実行時間（ミリ秒） |
| **エラー詳細** | name, message, stack |
| **メインページ情報** | URL, title, HTML size, User Agent, localStorage, sessionStorage, Cookie 数, HTML ダンプ |
| **他のページ情報** | URL, title, HTML size, HTML ダンプ（開いているすべてのタブ） |
| **Console logs** | type, text, location, ページ URL（すべてのタブから収集、最大 500 行/タブ） |
| **Network logs** | URL, method, status, headers, timing（すべてのタブから収集、最大 200 リクエスト/タブ） |
| **スクリーンショット** | メインページ: `_error.png`、他のタブ: `_error_tab1.png`, `_error_tab2.png`, ... |

### 個人情報のサニタイズ

診断情報保存時に以下のサニタイズ処理が自動的に適用される:

- **URL**: クエリパラメータとフラグメントを除去
- **localStorage/sessionStorage**: token, password, email, session, auth, secret, key を含むキーの値を `[REDACTED]` に置換
- **Network ヘッダー**: Authorization, Cookie, Set-Cookie を `[REDACTED]` に置換
- **Cookie**: 数のみ記録（内容は記録しない）

### 保存先とファイル形式

```
data/diagnostics/{providerName}/{YYYY-MM-DD}/
  YYYY-MM-DD-HH-mm-ss-nnn_methodName_error.json.gz
```

- `providerName`: クローラー名（小文字、例: `pointtowncrawler`, `ecnavicrawler`）
- gzip 圧縮された JSON ファイル

### 設定（環境変数）

| 環境変数 | デフォルト値 | 説明 |
|---------|-------------|------|
| `ENABLE_DIAGNOSTICS` | `true`（`false` で無効化） | 診断情報の有効/無効 |
| `DIAGNOSTICS_DIR` | `data/diagnostics` | 診断情報の保存先ディレクトリ |
| `SCREENSHOT_RETENTION_DAYS` | `7` | 診断情報の保持期間（日数、スクリーンショットと共通） |

### クリーンアップ

スクリーンショットと同じ保持期間（`SCREENSHOT_RETENTION_DAYS`）で自動削除される。

## 運用フロー

このプロジェクトは Claude Code を用いた自動運用を行う。

### 1. 新規機能・既存機能の変更検出（週1回）

**スケジュール**: 毎週土曜 8:00

**処理内容**:
1. PointTown と ECNavi のサイトを Chrome で探索
2. CLAUDE.md の実装済み機能一覧と比較
3. 既存の実装コード・ドキュメントを確認し、改善ポイントがないかを探索
4. 新機能や変更、改善ポイント (ドキュメント更新漏れなど) を検出したら GitHub Issue を作成
   - ラベル: `enhancement` または `bug` + `Waiting review`
   - 該当コードへのパーマネントリンク、スクリーンショット添付必須
   - アサイン: book000
5. 既存 Issue（クローズ済み含む）と重複する場合は作成しない

**実行方法**:
```bash
./scripts/weekly-detect-changes.sh
# または
/detect-changes
```

### 2. エラー原因の調査（週6回）

**スケジュール**: 毎日 8:00（土曜は除く）

**処理内容**:
1. 本番環境 `data/prod-data/` 配下の新しいログファイルを確認。`data/prod-data/screenshots/` および `data/prod-data/diagnostics/` も参照する。
2. **動作中のバージョンを確認する**（ログ冒頭の `🚀 collect-points v{version} を起動します` を確認）
3. エラーパターン（ERROR, failed, timeout 等）を検索
4. エラーがあれば診断情報（`data/diagnostics/` 配下の `.json.gz` ファイル）を確認し、Console logs, Network logs, HTML ダンプなどからエラーの詳細を分析する
5. 必要に応じて Chrome で再現確認・原因調査
6. GitHub Issue を作成
   - ラベル: `bug` + `waiting-review`
   - ログ、スクリーンショット添付
   - **動作バージョンを明記**（例: `v2.0.0 で発生`）
   - アサイン: book000
7. 確認済みログのタイムスタンプを記録（重複確認防止）

**実行方法**:
```bash
./scripts/investigate-errors.sh
# または
/investigate-errors
```

### 3. Approved Issue の実装（週6回）

**スケジュール**: 毎日 10:00（土曜は除く）

**処理内容**:
1. `approved` ラベルの付いた Issue を取得。Issue 本文・コメントも確認すること
2. 各 Issue について:
   - ブランチ作成（`feat/issue-{番号}-{説明}` or `fix/issue-{番号}-{説明}`）
   - Chrome でサイト調査（必要に応じて）
   - 実装パターンに従って実装
   - Lint 確認
   - CLAUDE.md などのドキュメント更新
   - コミット・プッシュ
   - PR 作成（`Closes #{Issue番号}` を含める）。レビュアーに book000 を設定
3. 既存 PR について、レビュー・CIエラー・コメントがあれば、対応を行う

**実行方法**:
```bash
./scripts/implement-approved.sh
# または
/implement-approved
```

### 4. ブランチ/PR クリーンアップ（週1回）

**スケジュール**: 毎週月曜 0:00

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
| `waiting-review` | レビュー待ち（自動作成直後）|
| `approved` | 実装承認済み（実装対象）|

### crontab 設定例

```crontab
# 週次: 新規機能・変更検出（毎週土曜 8:00）
0 8 * * 6 /home/tomachi/repos/collect-points/scripts/weekly-detect-changes.sh

# 週6回: エラー原因調査（土曜以外の毎日 8:00）
0 8 * * 0-5 /home/tomachi/repos/collect-points/scripts/investigate-errors.sh

# 週6回: Approved Issue 実装（土曜以外の毎日 10:00）
0 10 * * 0-5 /home/tomachi/repos/collect-points/scripts/implement-approved.sh

# 週次: ブランチ/PR クリーンアップ（毎週月曜 0:00）
0 0 * * 1 /home/tomachi/repos/collect-points/scripts/cleanup-branches.sh
```

## 開発コマンド

```bash
pnpm lint       # Lint チェック（prettier, eslint, tsc）
pnpm fix        # 自動修正
pnpm dev        # 開発実行
```

## chrome-devtools MCP を用いた動作確認の知見

### 基本方針

1. **セレクターの存在確認** → **実際のクリックテスト** の順で行う
2. `evaluate_script` ツールでセレクターの存在とクリックを行う
3. UID ベースのクリックではなく、JavaScript evaluate でセレクターベースのクリックを使用する

### 基本的なワークフロー

```bash
# 1. ページ一覧を取得
mcp__chrome-devtools__list_pages

# 2. 新しいページを開く（必要に応じて）
mcp__chrome-devtools__new_page
  url: "https://example.com"

# 3. ページに移動
mcp__chrome-devtools__navigate_page
  type: "url"
  url: "https://example.com/page"
  timeout: 30000

# 4. ページのスナップショットを取得（構造確認）
mcp__chrome-devtools__take_snapshot

# 5. スクリーンショットを取得（視覚確認）
mcp__chrome-devtools__take_screenshot
  format: "png"
```

### セレクター確認方法

```javascript
// evaluate_script で実行
() => {
  const element = document.querySelector('セレクター');
  return {
    exists: element ? true : false,
    href: element?.href,
    text: element?.textContent
  };
}
```

### セレクターでクリック

```javascript
// evaluate_script で実行
() => {
  const element = document.querySelector('セレクター');
  if (element) {
    element.click();
    return 'Clicked';
  } else {
    return 'Not found';
  }
}
```

### target="_blank" リンクの注意点

`target="_blank"` のリンクを JavaScript の `element.click()` でクリックしても、ブラウザのセキュリティ制約により新規タブは開かない。Puppeteer では `getNewTabPage()` 関数でユーザークリックをシミュレートするため、この問題は発生しない。

chrome-devtools MCP での動作確認時は、`target="_blank"` で開くページリンクについては `new_page` ツールで直接 URL を開き、確認すること。

### ページ読み込み待機

ページ遷移後は適切な待機時間を設定する。`navigate_page` の `timeout` パラメータで制御可能。

```bash
# navigation 後の待機は timeout で制御
mcp__chrome-devtools__navigate_page
  type: "url"
  url: "https://example.com"
  timeout: 30000  # 30秒

# または evaluate_script で明示的に待機
() => {
  return new Promise(resolve => setTimeout(() => resolve('waited'), 2000));
}
```

### ポイント変動の確認

操作前後でポイントを確認し、正しく動作しているか検証する。

```javascript
// PointTown のポイント確認
() => {
  const pointElement = document.querySelector('[data-testid="header-point"]') ||
                       document.querySelector('.header-point') ||
                       document.querySelector('span:has-text("pt")');
  return pointElement?.textContent;
}

// ECNavi のポイント確認
() => {
  const pointElement = document.querySelector('.header-point') ||
                       document.querySelector('span:has-text("pts.")');
  return pointElement?.textContent;
}
```

### ECNavi 実装済み機能

| 機能 | 実装パターン | 備考 |
|------|-------------|------|
| `entryLottery` | ボタンクリック | 宝くじエントリー |
| `gesoten` | 新規タブ + ガチャ | ゲソてんガチャ |
| `chirashi` | 新規タブ | チラシ閲覧 |
| `chinju` | クイズ回答 | 珍獣レッスン |
| `quiz` | クイズ回答 | 超難問クイズ王（ヒントページから回答検索）|
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
| `enqueteRally` | ドロップダウン選択 | アンケートラリー |

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
| `stamprally` | 進捗確認 | スタンプラリー（他機能で自動獲得）|

### ECNavi 固有のセレクター

| 機能 | セレクター | 備考 |
|------|-----------|------|
| `entryLottery` | `p.btn_entry a` | 宝くじエントリー |
| `chirashi` | `a.chirashi_link` | チラシページへのリンク |
| `chinju` | `a.chinju-lesson-question__link` | 珍獣レッスン |
| `quiz` | `p.todays-quiz__text`, `ul.choices__list button` | 超難問クイズ王 |
| `divination` | `ul.western-astrology-list button`, `ul.draw-tarot button`, `button.draw-omikuji__button` | 占い系 |
| `choice` | `ul.answer_botton button` | 二択アンケート |
| `fishing` | `#home .function button.gacha`, `#home .gacha div.scene_1 button.common` | 釣りパンダガチャ |
| `news` | `li.article-latest-item a.article-latest-item__link`, `button.article-reaction__feeling-button` | ニュース記事＋リアクション |
| `doron` | `ul.character-tanuki a`, `ul.character-kitsune a` | たぬきときつねでドロン |
| `fund` | `ul.click-fund-contents li:nth-child(1) a`, `ul.click-fund-contents li:nth-child(2) a` | クリック募金 |
| `enqueteRally` | `select.c_select`, `button.question-area__button.c_red` | アンケートラリー |

### PointTown 固有のセレクター

| 機能 | セレクター/URL | 備考 |
|------|---------------|------|
| `loginBonus` | `#js-get-reward-btn` | ログインボーナスポップアップ |
| `triangleLot` | `button.link-sankaku-kuji` | 三角くじボタン |
| `stamprally` | `#link-stamp-sec` | スタンプラリー進捗確認 |
| `pointQ` | `form#js-quiz-form` | ポイント Q フォーム |

### 広告ポップアップへの対処

ECNavi では Google Rewarded Ads のポップアップ（「短い広告を見る」）が表示されることがある。

- URL に `#goog_rewarded` が含まれる場合がある
- ポップアップが表示された場合は、ページをリロードするか、URL から `#goog_rewarded` を除去して再アクセス

### トラブルシューティング

1. **セレクターが見つからない場合**
   - `take_snapshot` で現在のページ構造を確認
   - `evaluate_script` で `document.querySelectorAll()` を使って類似セレクターを探索
   ```javascript
   () => {
     const elements = document.querySelectorAll('セレクター');
     return Array.from(elements).map(el => ({
       tag: el.tagName,
       class: el.className,
       id: el.id,
       text: el.textContent?.substring(0, 50)
     }));
   }
   ```

2. **クリックしても反応がない場合**
   - `navigate_page` の `timeout` パラメータで待機時間を延ばす
   - `evaluate_script` でスクロールして要素を表示領域に入れてからクリック
   ```javascript
   () => {
     const element = document.querySelector('セレクター');
     element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
     return 'Scrolled';
   }
   ```

3. **ログインが必要な場合**
   - まず `mypage` 等にアクセスしてログイン状態を確認（`navigate_page`）
   - 未ログインの場合はログインページに遷移してログイン処理を行う
