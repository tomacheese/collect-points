#!/bin/bash
# 月次: 古いブランチ/PR クリーンアップ
# crontab: 0 10 1 * * /path/to/cleanup-branches.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/data/logs"
LOG_FILE="$LOG_DIR/cleanup-branches-$(date +%Y%m%d-%H%M%S).log"

cd "$PROJECT_DIR"

# ログディレクトリがなければ作成
mkdir -p "$LOG_DIR"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

log "=== ブランチ/PR クリーンアップ開始: $(date) ==="

# リモートの最新情報を取得
log "📥 リモート情報を取得中..."
git fetch --all --prune 2>&1 | tee -a "$LOG_FILE"

# マージ済みのローカルブランチを削除（master, main, develop は除外）
log ""
log "🧹 マージ済みローカルブランチの削除..."
MERGED_BRANCHES=$(git branch --merged master 2>/dev/null | grep -v -E '^\*|master|main|develop' | sed 's/^[ \t]*//' || true)

if [ -n "$MERGED_BRANCHES" ]; then
  echo "$MERGED_BRANCHES" | while read -r branch; do
    if [ -n "$branch" ]; then
      log "  削除: $branch"
      git branch -d "$branch" 2>&1 | tee -a "$LOG_FILE" || true
    fi
  done
else
  log "  マージ済みブランチはありません"
fi

# リモートで削除されたブランチ（[gone]）のローカル参照を削除
log ""
log "🗑️ [gone] ブランチの削除..."
GONE_BRANCHES=$(git branch -vv 2>/dev/null | grep ': gone]' | awk '{print $1}' || true)

if [ -n "$GONE_BRANCHES" ]; then
  echo "$GONE_BRANCHES" | while read -r branch; do
    if [ -n "$branch" ]; then
      log "  削除: $branch (リモートで削除済み)"
      git branch -D "$branch" 2>&1 | tee -a "$LOG_FILE" || true
    fi
  done
else
  log "  [gone] ブランチはありません"
fi

# 古い PR の確認（30日以上更新がない Open な PR）
log ""
log "📋 古い PR の確認..."
if command -v gh &> /dev/null; then
  OLD_PRS=$(gh pr list --state open --json number,title,updatedAt --jq '.[] | select((.updatedAt | fromdateiso8601) < (now - 30*24*60*60)) | "#\(.number): \(.title)"' 2>/dev/null || true)

  if [ -n "$OLD_PRS" ]; then
    log "  ⚠️ 30日以上更新がない PR:"
    echo "$OLD_PRS" | while read -r pr; do
      log "    $pr"
    done
  else
    log "  古い PR はありません"
  fi
else
  log "  gh コマンドが見つからないためスキップ"
fi

# サマリー
log ""
log "=== クリーンアップ完了: $(date) ==="

# 現在のブランチ一覧
log ""
log "📊 現在のローカルブランチ:"
git branch | tee -a "$LOG_FILE"
