# ECNavi 3ゲーム実装修正報告

**日時**: 2026-02-09 06:10  
**対象ゲーム**: fishing, brainExerciseGame, spotdiffBox

## 修正内容

### 1. fishing.ts - 釣りパンダガチャ

#### 修正前の問題
- 直接 `/game/fishing/play/` にアクセスしていた（誤ったURL）
- 単純な待機のみでゲーム操作が不足

#### 修正後の実装
```typescript
// URL修正
await safeGoto(page, 'https://ecnavi.jp/fishing/redirect/', context.logger)

// ステップ1: 「釣りに行く」ボタンをクリック
// ステップ2: エサ選択（最初のbutton.commonをクリック）
// ステップ3: 竿選択（最初のbutton.commonをクリック）
// ステップ4: 「釣りをはじめる」ボタンをクリック
// ステップ5: 20秒待機（ゲーム自動実行）
```

#### 変更ポイント
1. **URL修正**: `/game/fishing/play/` → `/fishing/redirect/`（リダイレクト経由）
2. **3ステップフロー実装**:
   - ホーム画面で「釣りに行く」ボタンクリック
   - エサ選択画面で最初のエサ選択
   - 竿選択画面で最初の竿選択
   - 「釣りをはじめる」ボタンクリック
3. **待機時間**: 20秒（ゲームの自動実行を待つ）

---

### 2. brainExerciseGame.ts - 頭の体操ゲーム

#### 修正前の問題
- スタンプページにアクセスするだけで、個別ゲームをプレイしていなかった
- 「スタートする」ボタンのクリックがなかった

#### 修正後の実装
```typescript
// スタンプページのURLからクエリパラメータを取得
const urlObj = new URL(currentUrl)

// 個別ゲームリスト
const games = [
  { name: '三字熟語ゲーム', path: '/sanji/top.php' },
  { name: '英単語ゲーム', path: '/eitango/top.php' },
  { name: '計算ゲーム', path: '/keisan/top.php' },
]

// 各ゲームにアクセスして「スタートする」ボタンをクリック
for (const game of games.slice(0, 3)) {
  const gameUrl = `${urlObj.origin}${game.path}${urlObj.search}`
  await safeGoto(page, gameUrl, context.logger)
  // 「スタートする」ボタンを探してクリック
  // 広告視聴処理
  // 10秒待機（ゲームプレイ）
}
```

#### 変更ポイント
1. **個別ゲームアクセス**: スタンプページから個別ゲームURLを構築
2. **「スタートする」ボタンクリック**: ゲーム開始処理を追加
3. **複数ゲーム試行**: 最大3ゲームを順次実行
4. **広告視聴**: 各ゲームで広告があれば視聴
5. **エラーハンドリング**: ゲームが見つからない場合はスキップ

---

### 3. spotdiffBox.ts - まちがい探し

#### 修正前の問題
- 挑戦ボタンをクリックして待機するだけ
- 実際にまちがい探しの回答をクリックしていなかった

#### 修正後の実装
```typescript
// APIから回答データを取得
const apiResponse = await page.evaluate(async () => {
  const response = await fetch(
    'https://ecnavi.kantangame.com/spotdiffapi/start.json'
  )
  const data = await response.json()
  return data
})

if (apiResponse && apiResponse.status === 'OK') {
  answerData = apiResponse.data.question.answer_json_array
  // 各回答座標をクリック
  for (const answer of answerData) {
    const x = Math.floor((answer.x_from + answer.x_to) / 2)
    const y = Math.floor((answer.y_from + answer.y_to) / 2)
    
    // Canvas要素にMouseEventを発火
    await page.evaluate((clickX, clickY) => {
      const canvas = document.querySelector('canvas')
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + clickX,
          clientY: rect.top + clickY,
        })
        canvas.dispatchEvent(event)
      }
    }, x, y)
  }
}
```

#### 変更ポイント
1. **API実装**: `https://ecnavi.kantangame.com/spotdiffapi/start.json` から回答データ取得
2. **座標クリック**: APIから取得した6箇所の回答座標を順次クリック
3. **Canvas操作**: MouseEventを使ってCanvas要素をクリック
4. **エラーハンドリング**: API取得失敗時は広告視聴のみ実施

---

## 検証状況

### Dockerビルド
- ✅ ビルド成功（2026-02-09 06:07）
- ✅ TypeScript型チェック通過
- ⚠️ ESLintエラーあり（既存コードと同じパターン）

### 実行テスト（fishing）
- ✅ `--games=fishing` で個別実行可能
- ⚠️ ログインエラー発生（`Point element not found`）
- ⚠️ VNCポートは5900で正常にマッピング済み

### 残タスク
1. **VNCでログイン**: ポート5900経由でブラウザにアクセスしてログイン
2. **fishing テスト**: ログイン後に `--games=fishing` で再実行
3. **brainExerciseGame テスト**: `--games=brainExerciseGame` で実行
4. **spotdiffBox テスト**: `--games=spotdiffBox` で実行
5. **ポイント獲得確認**: 各ゲームで実際にポイントが増加することを確認

## 技術的判断記録

### fishing URL選択
- **採用**: `/fishing/redirect/`
- **代替案**: `/game/fishing/play/`（直接アクセス）
- **理由**: 他のゲームと同様にリダイレクト経由でアクセスする必要がある。直接アクセスではセッション情報が不足する可能性がある。
- **前提**: ECNaviの認証システムはリダイレクトURLを経由することでセッション情報を渡している。

### brainExerciseGame ゲーム選択
- **採用**: 個別ゲームURL（/sanji/, /eitango/, /keisan/）に順次アクセス
- **代替案**: スタンプページから自動でゲームリンクを探す
- **理由**: URLパターンが明確であり、直接アクセスが確実。リンク探索は変動リスクがある。
- **不確実性**: ゲームの利用可能性（1日5回制限）は実行時にチェック。

### spotdiffBox API利用
- **採用**: fetch APIでJSONを取得してクリック
- **代替案**: 画像認識による自動回答
- **理由**: APIが公開されており、確実性が高い。画像認識は複雑でエラーリスクが高い。
- **前提**: APIは常に利用可能で、レスポンス形式は変更されない。

## 次回作業

1. VNC経由でログイン（ポート5900）
2. 各ゲームを個別実行してポイント獲得を確認
3. 結果を `results/ecnavi-3games-verification.md` に記録
4. 必要に応じて実装を微調整

---

**作成**: 2026-02-09 06:10  
**作成者**: Claude (GitHub Copilot CLI)
