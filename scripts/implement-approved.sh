#!/bin/bash
# オンデマンド/定期: Approved ラベルの Issue を実装
# crontab (オプション): 0 11 * * 1 /path/to/implement-approved.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/data/logs/implement-approved-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

echo "=== Approved Issue 実装開始: $(date) ===" | tee -a "$LOG_FILE"

# Approved ラベルの Issue があるか確認
APPROVED_COUNT=$(gh issue list --repo book000/collect-points --state open --label "Approved" --json number | jq length)

if [ "$APPROVED_COUNT" -eq 0 ]; then
  echo "Approved ラベルの Issue はありません" | tee -a "$LOG_FILE"
  exit 0
fi

echo "Approved ラベルの Issue: ${APPROVED_COUNT} 件" | tee -a "$LOG_FILE"

# Claude Code を実行
claude -p "CLAUDE.md と .claude/commands/implement-approved.md を読んで、その内容に従って Approved ラベルが付いた Issue を実装してください。各 Issue ごとにブランチを作成し、実装して PR を作成してください。" \
  --allowedTools "Read,Write,Edit,Glob,Grep,Bash,WebFetch,mcp__claude-in-chrome__*" \
  2>&1 | tee -a "$LOG_FILE"

echo "=== Approved Issue 実装終了: $(date) ===" | tee -a "$LOG_FILE"
