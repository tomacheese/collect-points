# collect-points



## プロジェクトの目的

README を確認してください。

## コーディング規約

- コードスタイルは既存コードに従う

## プロジェクト構成

- `src/providers/` - 各ポイントサイトのクローラー実装
  - `pointtown.ts` - PointTown クローラー
  - `ecnavi.ts` - ECNavi クローラー
- `src/base-provider.ts` - クローラーの基底クラス
- `src/configuration.ts` - 設定ファイルの読み込み
- `src/functions.ts` - 共通ユーティリティ関数
- `src/version.ts` - バージョン情報取得（package.json から取得）
- `data/config.json` - 認証情報などの設定（Git 管理外）
- `.claude/commands/` - Claude Code 用スキル
  - `detect-changes.md` - 新規機能・変更検出
  - `investigate-errors.md` - エラー原因調査
  - `implement-approved.md` - Approved Issue 実装
- `.claude/hooks/` - Claud

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発
pnpm dev

# Lint
pnpm lint
```

## 新機能実装時の注意事項

- 既存のコード構造とパターンを維持する
- 適切なテストを追加する
- ドキュメントを更新する
