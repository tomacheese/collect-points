#!/bin/bash
# 3日ごと: エラー原因の調査
# crontab: 0 10 */3 * * /path/to/investigate-errors.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/data/logs"
LOG_FILE="$LOG_DIR/investigate-errors-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

# NVM 環境のロード（cron 環境では .bashrc が読み込まれないため）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

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

echo "=== エラー原因調査開始: $(date) ===" | tee -a "$LOG_FILE"

# Claude Code を実行（stream-json でリアルタイム進捗表示）
# --dangerously-skip-permissions: cron 環境での非インタラクティブ実行に必要
$CLAUDE_CMD --dangerously-skip-permissions -p "CLAUDE.md と .claude/commands/investigate-errors.md を読んで、その内容に従ってエラー原因を調査してください。data/logs/ 配下のログファイルを確認し、エラーがあれば Chrome で原因を調査して GitHub Issue を作成してください。

【重要】各ステップの開始時に進捗を報告してください：
1. 「📂 ログファイルの検索中...」
2. 「🔍 エラーパターンの検出中...」
3. 「🌐 Chrome でエラー原因の調査中...」（エラーがある場合）
4. 「📝 Issue 作成中...」（作成する場合）
5. 「✅ 完了: 調査結果のサマリー」" \
  --verbose \
  --chrome \
  --output-format stream-json \
  --allowedTools "Read,Glob,Grep,Bash,WebFetch,mcp__claude-in-chrome__*" \
  2>&1 | tee /dev/null | jq --unbuffered -r '
    (select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text),
    (select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | "🔧 ツール実行: " + .name),
    (select(.type == "result") | "\n=== 結果 ===\n" + (.result // "完了"))
  ' | tee -a "$LOG_FILE"

echo "=== エラー原因調査終了: $(date) ===" | tee -a "$LOG_FILE"
