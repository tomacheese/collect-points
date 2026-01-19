#!/bin/bash
# PreToolUse フック: git commit 実行前にブランチの状態をチェック
# stdin から JSON 形式のツール入力を受け取る

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# stdin から入力を読み取る
INPUT=$(cat)

# git commit コマンドかどうかをチェック
if ! echo "$INPUT" | grep -qE '"command".*git\s+(commit|push)'; then
  exit 0
fi

# ブランチ状態チェックを実行
cd "$PROJECT_DIR"
"$SCRIPT_DIR/check-branch-status.sh"
