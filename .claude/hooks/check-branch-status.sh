#!/bin/bash
# ブランチの状態をチェックするスクリプト
# SessionStart および PreToolUse フックから呼び出される

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_DIR"

# 現在のブランチ名を取得
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ -z "$CURRENT_BRANCH" ]; then
  exit 0
fi

# master/main/develop は除外
if [[ "$CURRENT_BRANCH" == "master" || "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "develop" ]]; then
  exit 0
fi

# リモートの最新情報を取得（エラーは無視）
git fetch origin --quiet 2>/dev/null || true

# 現在のブランチがマージ済みかどうかをチェック
MERGED_INTO_MASTER=$(git branch -r --merged origin/master 2>/dev/null | grep -E "origin/$CURRENT_BRANCH$" || true)

if [ -n "$MERGED_INTO_MASTER" ]; then
  echo "⚠️ 警告: 現在のブランチ '$CURRENT_BRANCH' は既に master にマージされています。"
  echo "このブランチで作業を続けると、コミット履歴がおかしくなる可能性があります。"
  echo ""
  echo "推奨アクション:"
  echo "  1. master ブランチに切り替える: git checkout master && git pull"
  echo "  2. 新しいブランチを作成する: git checkout -b <新しいブランチ名>"
  echo "  3. このブランチを削除する: git branch -d $CURRENT_BRANCH"
  exit 1
fi

# このブランチに対応する PR がマージ/クローズされているかチェック
if command -v gh &> /dev/null; then
  PR_STATE=$(gh pr list --head "$CURRENT_BRANCH" --state all --json state,mergedAt --jq '.[0] | if .mergedAt != null then "merged" elif .state == "CLOSED" then "closed" else "open" end' 2>/dev/null || echo "")

  if [ "$PR_STATE" == "merged" ]; then
    echo "⚠️ 警告: ブランチ '$CURRENT_BRANCH' の PR は既にマージされています。"
    echo "このブランチで作業を続けると、コミット履歴がおかしくなる可能性があります。"
    echo ""
    echo "推奨アクション:"
    echo "  1. master ブランチに切り替える: git checkout master && git pull"
    echo "  2. 新しいブランチを作成する: git checkout -b <新しいブランチ名>"
    exit 1
  elif [ "$PR_STATE" == "closed" ]; then
    echo "⚠️ 警告: ブランチ '$CURRENT_BRANCH' の PR はクローズされています。"
    echo "このブランチで作業を続ける場合は、新しい PR を作成する必要があるかもしれません。"
  fi
fi

exit 0
