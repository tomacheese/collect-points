# 新規機能・既存機能の変更検出

PointTown と ECNavi のサイトを探索し、新規機能や既存機能の変更を検出する。

## 実行手順

### 1. 既存の GitHub Issues を確認

```bash
gh issue list --repo book000/collect-points --state all --label "enhancement" --json number,title,state
gh issue list --repo book000/collect-points --state all --label "bug" --json number,title,state
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

### 4. 変更・新機能を検出した場合

スクリーンショットを撮影し、以下の情報を収集：

- 機能名
- URL
- ゲームの遊び方・ポイント獲得方法
- 必要なインタラクション（ボタンクリック、広告視聴など）

### 5. GitHub Issue を作成

検出した新機能・変更ごとに Issue を作成する。

```bash
gh issue create \
  --repo book000/collect-points \
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
  --label "Waiting review"
```

バグ（既存機能が動作しなくなった等）の場合は `--label "bug"` を使用。

### 6. 結果の報告

検出した新機能・変更の数と、作成した Issue の一覧を報告する。

## 注意事項

- 重複 Issue を作成しない（既存 Issue を必ず確認）
- クローズ済みの Issue も重複チェックの対象に含める
- スクリーンショットは必ず添付し、Issue 上で状況を理解できるようにする
- 不明な点がある場合は、Issue 本文に記載して後で確認できるようにする
