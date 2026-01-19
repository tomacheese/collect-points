# collect-points

Puppeteer を使用してポイントサイト（PointTown、ECNavi）のポイント収集を自動化するプロジェクト。

## プロジェクトの目的

**このプロジェクトの目的はポイントを「収集」すること。** 単なるページ遷移ではなく、実際にポイントが獲得できるインタラクションを実装する必要がある。

## コーディング規約

- TypeScript を使用
- ESLint + Prettier でコード品質を管理
- Puppeteer（rebrowser-puppeteer-core）でブラウザ操作
- コメントは日本語で記載
- エラーメッセージは英語で記載

## プロジェクト構成

- `src/providers/` - 各ポイントサイトのクローラー実装
  - `pointtown.ts` - PointTown クローラー
  - `ecnavi.ts` - ECNavi クローラー
- `src/base-provider.ts` - クローラーの基底クラス
- `src/configuration.ts` - 設定ファイルの読み込み
- `src/functions.ts` - 共通ユーティリティ関数
- `data/config.json` - 認証情報などの設定（Git 管理外）
- `scripts/` - crontab 用スクリプト

## 新機能実装時の注意事項

1. **URL のリダイレクト確認だけでは不十分** - ページに遷移して待機するだけではポイントは取得できない
2. **実際にポイントが取得できるインタラクションを実装する** - ボタンクリック、ゲームプレイ、広告視聴など
3. **動作確認時はポイントの増減を確認する** - 操作前後でポイント数を比較して検証

## 実装パターン

### パターン 1: 広告視聴型

多くのゲームは広告視聴後にポイント/スタンプが獲得できる。

```typescript
async gameWithAd(page: Page): Promise<void> {
  await page.goto('https://example.com/game/redirect', {
    waitUntil: 'networkidle2',
  })

  const startButton = await page
    .waitForSelector('button.start-button', { timeout: 5000 })
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  await this.watchAdIfExists(page)
  await sleep(5000)
}
```

### パターン 2: クイズ/回答型

クイズに回答してポイントを獲得する。

```typescript
async quizGame(page: Page): Promise<void> {
  await page.goto('https://example.com/quiz', {
    waitUntil: 'networkidle2',
  })

  for (let i = 0; i < 10; i++) {
    const answerButtons = await page.$$('button.answer-choice')
    if (answerButtons.length === 0) break

    const randomIndex = Math.floor(Math.random() * answerButtons.length)
    await answerButtons[randomIndex].click()
    await sleep(2000)
  }
}
```

### パターン 3: スタンプ収集型

訪問やゲーム参加でスタンプを集め、一定数でくじが引ける。

## 開発コマンド

```bash
npm run lint       # Lint チェック（prettier, eslint, tsc）
npm run fix        # 自動修正
npm run dev        # 開発実行
```

## Git コミット規約

- Conventional Commits に従う
- `<description>` は日本語で記載
- 例: `feat: ECNavi にアンケートラリー機能を追加`
