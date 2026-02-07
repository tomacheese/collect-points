# 新規機能・既存機能の変更検出

PointTown と ECNavi のサイトを探索し、新規機能や既存機能の変更を検出する。

## 実行手順

### 1. 既存の GitHub Issues を確認

```bash
gh issue list --repo tomacheese/collect-points --state all --label "enhancement" --json number,title,state
gh issue list --repo tomacheese/collect-points --state all --label "bug" --json number,title,state
```

すでに issue 化されているものは重複して作成しない。

### 2. CLAUDE.md から実装済み機能一覧を取得

CLAUDE.md の「実装済み機能」セクションを参照し、現在実装されている機能を把握する。

### 3. サイトを探索

Claude in Chrome を使用して、以下のサイトを探索する：

#### PointTown

1. https://www.pointtown.com/ にアクセス
2. ゲームページ（/game）を確認
3. 各ゲームのリンクを確認し、実装済み機能一覧と比較
4. 新しいゲームや変更されたゲームを特定

#### ECNavi

1. https://ecnavi.jp/ にアクセス
2. 「毎日貯まる」メニューを確認
3. 各ゲーム/コンテンツのリンクを確認し、実装済み機能一覧と比較
4. 新しいゲームや変更されたコンテンツを特定

### 3.5. 既存機能のセレクター検証（重要）

CLAUDE.md の「PointTown 固有のセレクター」および「ECNavi 固有のセレクター」の表を参照し、各セレクターが実際のページに存在するか検証する：

#### PointTown セレクター検証

1. CLAUDE.md の「PointTown 固有のセレクター」表（430 行目付近）を確認
2. 各機能の URL にアクセス（ログイン状態で）
3. JavaScript ツールでセレクターの存在を確認：
   ```javascript
   const selector = 'セレクター';
   const element = document.querySelector(selector);
   ({exists: element ? true : false, actualId: element?.id, actualClass: element?.className})
   ```
4. セレクターが見つからない、または異なる要素を指している場合：
   - スクリーンショットを撮影
   - 正しいセレクターを特定
   - Issue を作成（ラベル: `bug`, `waiting-review`）

#### ECNavi セレクター検証

1. CLAUDE.md の「ECNavi 固有のセレクター」表（445 行目付近）を確認
2. 同様に各セレクターを検証

#### 実装コードとの整合性チェック

1. CLAUDE.md のセレクターと実装コード（`src/providers/*/contents/*.ts`）を比較
2. 不整合がある場合は Issue を作成

### 4. 変更・新機能を検出した場合

スクリーンショットを撮影し、以下の情報を収集：

- 機能名
- URL
- ゲームの遊び方・ポイント獲得方法
- 必要なインタラクション（ボタンクリック、広告視聴など）

### 5. GitHub Issue を作成

検出した新機能・変更ごとに Issue を作成する。

#### 新機能の場合

```bash
gh issue create \
  --repo tomacheese/collect-points \
  --title "[機能追加] {機能名}" \
  --body "## 概要
{機能の説明}

## URL
{URL}

## ポイント獲得方法
{遊び方・ポイント獲得方法}

## 必要なインタラクション
{ボタンクリック、広告視聴など}

## スクリーンショット
{スクリーンショット}

## 検出日
$(date +%Y-%m-%d)" \
  --label "enhancement" \
  --label "waiting-review"
```

#### セレクター不整合の場合

```bash
gh issue create \
  --repo tomacheese/collect-points \
  --title "[バグ] {機能名}: セレクターが無効" \
  --body "## 概要
{機能名} のセレクターが実際のページと一致しません。

## 現在のセレクター (CLAUDE.md)
\`{現在のセレクター}\`

## 実際のページ
- URL: {URL}
- 正しいセレクター: \`{正しいセレクター}\` (または「要調査」)
- 要素の ID: \`{要素の ID}\`
- 要素のクラス: \`{要素のクラス}\`

## 影響
この機能は正常に動作しない可能性があります。

## 対応方針
1. Chrome で実際のページを確認
2. 正しいセレクターを特定
3. \`src/providers/{provider}/contents/{file}.ts\` を修正
4. CLAUDE.md のセレクター表を更新

## スクリーンショット
{スクリーンショット}

## 検出日
$(date +%Y-%m-%d)" \
  --label "bug" \
  --label "waiting-review"
```

#### 既存機能の UI 変更の場合

```bash
gh issue create \
  --repo tomacheese/collect-points \
  --title "[バグ] {機能名}: UI が変更された" \
  --body "## 概要
{機能名} の UI が変更され、既存の実装が動作しない可能性があります。

## URL
{URL}

## 変更内容
{UI の変更内容}

## 影響
{影響の説明}

## 対応方針
1. Chrome で新しい UI を確認
2. 必要なインタラクションを特定
3. 実装コードを更新
4. CLAUDE.md のドキュメントを更新

## スクリーンショット
{スクリーンショット}

## 検出日
$(date +%Y-%m-%d)" \
  --label "bug" \
  --label "waiting-review"
```

### 6. 結果の報告

検出した新機能・変更の数と、作成した Issue の一覧を報告する。

## 注意事項

- 重複 Issue を作成しない（既存 Issue を必ず確認）
- クローズ済みの Issue も重複チェックの対象に含める
- スクリーンショットは必ず添付し、Issue 上で状況を理解できるようにする
- 不明な点がある場合は、Issue 本文に記載して後で確認できるようにする
- **セレクター検証は必須**: エラーが発生する前に UI 変更を検出するため、毎回実施すること
- セレクターが見つからない場合は、JavaScript ツールで代替セレクターを探索し、Issue に記載すること
- CLAUDE.md のセレクター表と実装コードの整合性も必ず確認すること
