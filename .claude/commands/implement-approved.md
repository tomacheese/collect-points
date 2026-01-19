# Approved Issue の実装

GitHub で「Approved」ラベルが付与された Issue を実装する。

## 実行手順

### 1. Approved ラベルの Issue を取得

```bash
gh issue list \
  --repo tomacheese/collect-points \
  --state open \
  --label "Approved" \
  --json number,title,body,labels
```

### 2. Issue ごとに実装を行う

各 Issue について、以下の手順で実装：

#### 2.1 ブランチを作成

Issue 番号とタイトルからブランチ名を生成：

- 機能追加: `feat/issue-{番号}-{短い説明}`
- バグ修正: `fix/issue-{番号}-{短い説明}`

```bash
# 例: feat/issue-123-add-new-game
git checkout master
git pull origin master
git checkout -b feat/issue-{番号}-{短い説明}
```

#### 2.2 Issue の内容を理解

Issue 本文から以下を把握：

- 実装する機能/修正するバグの概要
- URL やスクリーンショット
- 必要なインタラクション

#### 2.3 必要に応じてサイトを調査

Claude in Chrome を使用して：

- 対象ページにアクセス
- セレクターを特定
- ゲームの流れを確認

#### 2.4 実装

CLAUDE.md の「実装パターン」を参考に実装：

- 広告視聴型
- クイズ/回答型
- スタンプ収集型

コード変更箇所：

- `src/providers/pointtown.ts` または `src/providers/ecnavi.ts`
- `crawl()` メソッドに新しいメソッド呼び出しを追加
- 新しいメソッドを実装

#### 2.5 Lint 確認

```bash
npm run lint
```

エラーがあれば修正。

#### 2.6 コミット

Conventional Commits 形式でコミット：

```bash
git add .
git commit -m "feat: {機能の説明}

Closes #{Issue番号}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

#### 2.7 プッシュ

```bash
git push -u origin {ブランチ名}
```

#### 2.8 PR を作成

```bash
gh pr create \
  --repo tomacheese/collect-points \
  --title "feat: {機能の説明}" \
  --body "## Summary
- {変更内容1}
- {変更内容2}

## Related Issue
Closes #{Issue番号}

## Test plan
- [ ] Lint が通ること
- [ ] 対象機能のポイント獲得を確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base master
```

### 3. Issue から Approved ラベルを削除

実装完了後、PR がマージされるまで Issue はオープンのままにする。
（PR がマージされると自動的にクローズされる）

### 4. 結果の報告

- 実装した Issue の数
- 作成した PR の一覧
- 実装できなかった Issue（理由と共に）

## 注意事項

- 1 つの Issue につき 1 つのブランチ・PR を作成
- Conventional Commits に従う（description は日本語）
- Lint エラーがない状態でコミット
- PR 本文には Issue 番号を含める（`Closes #番号`）
- CLAUDE.md の実装済み機能一覧は PR マージ後に更新
