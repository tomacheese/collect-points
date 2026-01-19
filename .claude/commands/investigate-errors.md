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

### 3. ログからエラーを抽出

各ログファイルから以下のパターンを検索：

- `ERROR`
- `Error`
- `failed`
- `exception`
- `timeout`

```bash
grep -i -E "(error|failed|exception|timeout)" /data/logs/*.log
```

### 4. 既存の GitHub Issues を確認

```bash
gh issue list --repo tomacheese/collect-points --state all --label "bug" --json number,title,body,state
```

同じエラーがすでに issue 化されていないか確認する。
エラーメッセージやスタックトレースの類似性で判断。

### 5. エラーの原因を調査

エラーが見つかった場合、以下を実施：

1. **ログの詳細確認**: エラー前後のログを確認し、コンテキストを把握
2. **スクリーンショット確認**: `/data/screenshots/` 配下の該当時刻のスクリーンショットを確認
3. **Chrome で再現確認**: Claude in Chrome を使用して、エラーが発生した機能を実際に操作し、現在の状態を確認

### 6. GitHub Issue を作成

エラーごとに Issue を作成する。

```bash
gh issue create \
  --repo tomacheese/collect-points \
  --title "[バグ] {機能名}: {エラー概要}" \
  --body "## エラー概要
{エラーの説明}

## 発生日時
{ログのタイムスタンプ}

## エラーログ
\`\`\`
{関連するログ}
\`\`\`

## 調査結果
{原因の分析}

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

### 7. チェック完了時刻を記録

```bash
date +%Y-%m-%dT%H:%M:%S > "$LAST_CHECK_FILE"
```

### 8. 結果の報告

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
