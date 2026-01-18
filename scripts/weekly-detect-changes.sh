#!/bin/bash
# 週次: 新規機能・既存機能の変更検出
# crontab: 0 9 * * 0 /path/to/weekly-detect-changes.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/data/logs/detect-changes-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

echo "=== 新規機能・変更検出開始: $(date) ===" | tee -a "$LOG_FILE"

# Claude Code を実行
claude -p "CLAUDE.md と .claude/commands/detect-changes.md を読んで、その内容に従って新規機能・既存機能の変更を検出してください。Chrome を使用してサイトを探索し、見つけた新機能や変更は GitHub Issue を作成してください。" \
  --allowedTools "Read,Glob,Grep,Bash,WebFetch,mcp__claude-in-chrome__*" \
  2>&1 | tee -a "$LOG_FILE"

echo "=== 新規機能・変更検出終了: $(date) ===" | tee -a "$LOG_FILE"
