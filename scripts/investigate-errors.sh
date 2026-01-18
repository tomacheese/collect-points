#!/bin/bash
# 3日ごと: エラー原因の調査
# crontab: 0 10 */3 * * /path/to/investigate-errors.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/data/logs/investigate-errors-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

echo "=== エラー原因調査開始: $(date) ===" | tee -a "$LOG_FILE"

# Claude Code を実行
claude -p "CLAUDE.md と .claude/commands/investigate-errors.md を読んで、その内容に従ってエラー原因を調査してください。/data/logs/ 配下のログファイルを確認し、エラーがあれば Chrome で原因を調査して GitHub Issue を作成してください。" \
  --allowedTools "Read,Glob,Grep,Bash,WebFetch,mcp__claude-in-chrome__*" \
  2>&1 | tee -a "$LOG_FILE"

echo "=== エラー原因調査終了: $(date) ===" | tee -a "$LOG_FILE"
