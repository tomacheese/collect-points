# spotdiffBox 調査結果（2026-02-09）

## 調査概要

ECNavi の「まちがい探しボックス」ゲームの動作を Chrome DevTools MCP で調査。

## 結果サマリー

**結論**: 現在のゲームは広告による初期化問題とPixiJSレンダラーエラーにより、完全な自動化は困難。

## 詳細調査結果

### 1. ゲームアクセス

- **リダイレクトURL**: `https://ecnavi.jp/spotdiff_box/redirect/`
- **実際のゲームURL**: `https://ecnavi.kantangame.com/spotdiff?user_id=...&media_id=117&time=...&key=...`
- **ゲーム画面URL**: `https://ecnavi.kantangame.com/spotdiff/game/327?media_id=117&user_id=...&time=...&key=...`

### 2. 挑戦状況

- **1問目**: 挑戦可能（難易度: やさしい）
- **2問目**: 挑戦済み
- **3問目**: 挑戦済み
- **4-6問目**: 10:00 解放
- **7-9問目**: 18:00 解放

→ 既に本日2-3回プレイ済み

### 3. 技術的問題

#### 問題1: 広告の表示と初期化ブロック

- ゲーム画面にアクセスすると、iframe内に広告が表示される
- 広告は Yahoo! の健康保険協会の広告（インタースティシャル広告）
- **広告の閉じるボタンが表示されているが、クリックできない**
- クロスオリジンiframeのため、JavaScriptから直接操作不可
- 30秒以上待っても広告は自動的に閉じない

#### 問題2: PixiJS レンダラーエラー

Console logs:
```
[error] Uncaught (in promise) Error: Unable to auto-detect a suitable renderer.
```

- まちがい探しゲームは PixiJS を使用
- 広告が表示されている間、ゲームのレンダラーが初期化できない
- レンダラーが初期化できないため、ゲーム画面（Canvas要素）が表示されない

#### 問題3: API通信の不在

- ユーザーが以前言及した `https://ecnavi.kantangame.com/spotdiffapi/start.json` への通信は確認されなかった
- ゲーム開始時のネットワーク通信を確認したが、以下のみ:
  - ページHTML
  - CSS/JS ファイル
  - 画像ファイル（問題画像のプレビュー）
  - 広告関連リクエスト（Google Ads, Yahoo Ads）
  - **spotdiffapi/start.json へのリクエストは無し**

### 4. ネットワーク通信詳細

確認されたリクエスト（広告関連以外）:
1. `GET https://ecnavi.kantangame.com/spotdiff/game/327?...` (HTML)
2. `GET https://img.kantangame.com/spotdiff/pixijs/js/media-default/game-config.js` (ゲーム設定)
3. `GET https://img.kantangame.com/spotdiff/pixijs/js/media-default/main.js` (ゲームメイン)
4. 各種画像ファイル（question_image_pre/327_A.jpg など）

**API エンドポイントへのリクエストは観測されず**

### 5. Console ログ詳細

重要なログ:
```
[log] インタースティシャル広告スロットを定義しました
[log] inGameリワード広告スロットを定義しました
[error] Uncaught (in promise) Error: Unable to auto-detect a suitable renderer.
[log] IMA ads AdError 303: No Ads VAST response after one or more Wrappers
[log] Adsense Ready
```

- 広告システムは正常に初期化
- ゲームのレンダラーは初期化失敗
- 広告エラーも発生（AdError 303）

### 6. 実装コードとの比較

現在の実装 (`src/providers/ecnavi/contents/spotdiff-box.ts`):

1. `/spotdiff_box/redirect/` にアクセス ✅ 正しい
2. 挑戦ボタンをクリック → **広告が表示され、ゲームが開始しない**
3. APIから回答を取得 → **APIリクエストが発生しない**
4. Canvas要素に座標クリック → **Canvas要素が表示されない**

## 結論と推奨事項

### 現状の問題点

1. **広告ブロック問題**: インタースティシャル広告がゲーム初期化をブロック
2. **レンダラー初期化失敗**: PixiJSレンダラーが初期化できず、ゲーム画面が表示されない
3. **API通信無し**: 以前確認されたAPIエンドポイントへの通信が観測されない
4. **既にプレイ済み**: 本日既に2-3問プレイ済みのため、新規挑戦できる問題が少ない

### 推奨対応

#### オプション1: 広告ブロック/スキップ

- Puppeteer の広告ブロック拡張機能を使用
- または、広告リクエストを HTTP レベルでブロック
- ただし、広告をブロックするとゲーム自体がエラーになる可能性が高い

#### オプション2: 待機時間の延長

- 広告が自動的に終了するまで待機（60-90秒）
- しかし、30秒待っても広告は終了しなかった

#### オプション3: 機能の無効化

- このゲームは自動化困難と判断し、一時的に無効化
- コメントアウトまたは条件分岐で実行をスキップ

#### オプション4: 時間帯の調整

- 10:00 または 18:00 以降に実行し、より多くの問題が解放されている状態でテスト
- ただし、広告とレンダラーの問題は解決しない

### 最終推奨

**このゲームは現状では自動化不可と判断**

理由:
1. 広告システムが完全にゲームの初期化をブロックしている
2. PixiJSレンダラーエラーにより、Canvas要素が表示されない
3. APIエンドポイントへのアクセス方法が不明（GET/POST判定不可）
4. クロスオリジンiframeのため、広告操作が不可能

→ `spotdiffBox` メソッドを一時的にスキップする実装を推奨

## 追加メモ

- ゲームは正常に動作する時間帯や条件があるかもしれない（深夜、週末など）
- 広告ブロッカーを使用している通常のブラウザでは正常に動作する可能性がある
- API エンドポイント（`/spotdiffapi/start.json`）は別のフローで使用されるかもしれない
