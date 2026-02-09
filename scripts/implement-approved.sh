#!/bin/bash
# オンデマンド/定期: Approved ラベルの Issue を実装
# crontab (オプション): 0 11 * * 1 /path/to/implement-approved.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/data/logs"
LOG_FILE="$LOG_DIR/implement-approved-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

# NVM 環境のロード（cron 環境では .bashrc が読み込まれないため）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ~/.local/bin を PATH に追加（cron 環境で claude コマンドを使用するため）
export PATH="$HOME/.local/bin:$PATH"

# claude コマンドのパスを設定
if command -v claude &> /dev/null; then
  CLAUDE_CMD="claude"
else
  echo "❌ エラー: claude コマンドが見つかりません。" >&2
  exit 1
fi

# 必要なコマンドの確認
if ! command -v jq &> /dev/null; then
  echo "❌ エラー: jq コマンドが見つかりません。インストールしてください。" >&2
  exit 1
fi

# ログディレクトリがなければ作成
mkdir -p "$LOG_DIR"

echo "=== Approved Issue 実装開始: $(date) ===" | tee -a "$LOG_FILE"

# Approved ラベルの Issue があるか確認
APPROVED_COUNT=$(gh issue list --repo tomacheese/collect-points --state open --label "Approved" --json number | jq length)

if [ "$APPROVED_COUNT" -eq 0 ]; then
  echo "Approved ラベルの Issue はありません" | tee -a "$LOG_FILE"
  exit 0
fi

echo "Approved ラベルの Issue: ${APPROVED_COUNT} 件" | tee -a "$LOG_FILE"

# Claude Code を実行（stream-json でリアルタイム進捗表示）
# --dangerously-skip-permissions: cron 環境での非インタラクティブ実行に必要
$CLAUDE_CMD --dangerously-skip-permissions -p "CLAUDE.md と .claude/commands/implement-approved.md を読んで、その内容に従って Approved ラベルが付いた Issue を実装してください。各 Issue ごとにブランチを作成し、実装して PR を作成してください。

【重要】各ステップの開始時に進捗を報告してください：
1. 「📋 Approved Issue の取得中...」
2. 「🔍 Issue #{番号} の調査中...」（各 Issue ごと）
3. 「🌿 ブランチ作成中: {ブランチ名}」
4. 「💻 実装中: {機能名}」
5. 「✅ Lint チェック中...」
6. 「📤 コミット・プッシュ中...」
7. 「🔀 PR 作成中...」
8. 「✅ 完了: 実装結果のサマリー」" \
  --verbose \
  --chrome \
  --output-format stream-json \
  --allowedTools "Read,Write,Edit,Glob,Grep,Bash,WebFetch,mcp__claude-in-chrome__*" \
  2>&1 | tee /dev/null | jq --unbuffered -r '
    (select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text),
    (select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | "🔧 ツール実行: " + .name),
    (select(.type == "result") | "\n=== 結果 ===\n" + (.result // "完了"))
  ' | tee -a "$LOG_FILE"

echo "=== Approved Issue 実装終了: $(date) ===" | tee -a "$LOG_FILE"
