#!/bin/bash
# ECNaviの全ゲームのURLをチェックするスクリプト

echo "ECNavi ゲーム URL チェック"
echo "======================================"

# 実装ファイルからURLを抽出
echo "実装ファイルからURLを抽出中..."

grep -r "safeGoto\|goto" src/providers/ecnavi/contents/ | \
  grep -o "https://ecnavi\.jp/[^'\"]*" | \
  sort -u > results/ecnavi-urls.txt

echo "抽出されたURL一覧:"
cat results/ecnavi-urls.txt

echo ""
echo "URL数: $(wc -l < results/ecnavi-urls.txt)"
