# エラー原因の調査

collect-points の実行ログを確認し、エラーがある場合はその原因を調査する。

## 実行手順

### 1. 確認済みログの管理

確認済みログのタイムスタンプを記録するファイルを使用する。

```bash
LAST_CHECK_FILE="/data/last-error-check.txt"

# 前回チェック日時を取得（ファイルがなければ 3 日前）
if [ -f "$LAST_CHECK_FILE" ]; then
  LAST_CHECK=$(cat "$LAST_CHECK_FILE")
else
  LAST_CHECK=$(date -d "3 days ago" +%Y-%m-%dT%H:%M:%S)
fi
```

### 2. 新しいログファイルを特定

```bash
# /data/logs/ 配下の新しいログファイルを探す
find /data/logs -name "*.log" -newermt "$LAST_CHECK" -type f
```

### 3. 動作中のバージョンを確認

ログファイルの冒頭にある起動メッセージからバージョンを確認する。

```bash
# ログ冒頭のバージョン情報を取得
grep "collect-points v" /data/logs/*.log | head -5
```

バージョン情報は `🚀 collect-points v{version} を起動します` の形式で出力される。
Issue 作成時にこのバージョン情報を明記すること。

### 4. ログからエラーを抽出

各ログファイルから以下のパターンを検索：

- `ERROR`
- `Error`
- `failed`
- `exception`
- `timeout`

```bash
grep -i -E "(error|failed|exception|timeout)" /data/logs/*.log
```

### 5. 既存の GitHub Issues を確認

```bash
gh issue list --repo tomacheese/collect-points --state all --label "bug" --json number,title,body,state
```

同じエラーがすでに issue 化されていないか確認する。
エラーメッセージやスタックトレースの類似性で判断。

### 6. エラーの原因を調査

エラーが見つかった場合、以下を実施：

1. **ログの詳細確認**: エラー前後のログを確認し、コンテキストを把握
2. **診断情報の確認（最重要）**: `/data/diagnostics/` または `data/prod-data/diagnostics/` 配下の該当する `.json.gz` ファイルを確認
   - Console logs: ブラウザコンソールのログからエラーの詳細を確認
   - Network logs: ネットワークリクエストの失敗やタイムアウトを確認
   - HTML ダンプ: ページの実際の HTML 構造を確認
   - **診断情報が存在する場合は必ず確認し、その内容を Issue に含めること**
   - **診断情報が存在しない場合は、なぜ存在しないのか（診断機能の不具合の可能性）を明記すること**
3. **スクリーンショット確認**: `/data/screenshots/` または `data/prod-data/screenshots/` 配下の該当時刻のスクリーンショットを確認
4. **Chrome で再現確認**: chrome-devtools MCP を使用して、エラーが発生した機能を実際に操作し、現在の状態を確認
   - `navigate_page` でページにアクセス
   - `take_snapshot` でページ構造を確認
   - `evaluate_script` で JavaScript を実行してセレクターや要素の状態を確認
   - `take_screenshot` で視覚的な状態を確認

**重要**: 推測のみで原因を記載してはならない。診断情報、スクリーンショット、ログの詳細、Chrome での再現確認など、**実際のデータに基づいて** 原因を特定すること。不明な場合は「原因不明」と明記し、確認した情報のみを記載する。

### 7. GitHub Issue を作成

エラーごとに Issue を作成する。

```bash
gh issue create \
  --repo tomacheese/collect-points \
  --title "[バグ] {機能名}: {エラー概要}" \
  --body "## エラー概要
{エラーの説明}

## 動作バージョン
{バージョン情報（例: v2.0.0）}

## 発生日時
{ログのタイムスタンプ}

## エラーログ
\`\`\`
{関連するログ}
\`\`\`

## 診断情報
{診断情報ファイルのパスと主要な内容}
- Console logs の重要なエラー
- Network logs の失敗したリクエスト
- HTML ダンプから分かる問題
- **診断情報が存在しない場合**: なぜ診断情報が出力されなかったのか（例: getCurrentPoint() のエラーは診断情報対象外）

## 調査結果
{原因の分析（実際のデータに基づく）}

## 再現手順
1. {手順1}
2. {手順2}
...

## スクリーンショット
{スクリーンショット}

## 想定される修正方法
{修正案}" \
  --label "bug" \
  --label "Waiting review"
```

### 8. チェック完了時刻を記録

```bash
date +%Y-%m-%dT%H:%M:%S > "$LAST_CHECK_FILE"
```

### 9. 結果の報告

- 確認したログファイルの数
- 検出したエラーの数
- 作成した Issue の一覧
- 既存 Issue との重複でスキップしたエラーの数

## 注意事項

- 重複 Issue を作成しない（エラーメッセージの類似性で判断）
- クローズ済みの Issue も重複チェックの対象に含める
- 一時的なネットワークエラーなど、リトライで解決する問題は issue 化しない
- 継続的に発生するエラーのみ issue 化する
- スクリーンショットがある場合は必ず添付
