#!/bin/bash
# ECNaviの個別ゲームをテストするスクリプト

if [ -z "$1" ]; then
  echo "使用方法: $0 <ゲーム名>"
  echo ""
  echo "利用可能なゲーム:"
  echo "  entryLottery       - 宝くじエントリー"
  echo "  gesoten            - ゲソてんガチャ"
  echo "  chirashi           - チラシ閲覧"
  echo "  chinju             - 珍獣先生"
  echo "  quiz               - 超難問クイズ王"
  echo "  divination         - 占い3種"
  echo "  fishing            - 釣りパンダガチャ"
  echo "  choice             - 二択アンケート"
  echo "  news               - ニュース記事"
  echo "  garapon            - ガラポン"
  echo "  doron              - たぬきときつねでドロン"
  echo "  ticketingLottery   - 宝くじチケット使用"
  echo "  fund               - クリック募金"
  echo "  natsupoi           - ナツポイ"
  echo "  languageTravel     - 語学トラベル"
  echo "  brainExerciseGame  - 頭の体操ゲーム"
  echo "  easyGame           - かんたんゲーム"
  echo "  brainTraining      - 脳トレクイズ"
  echo "  vegetable          - ポイント畑"
  echo "  chocoRead          - ちょこ読み"
  echo "  enqueteRally       - アンケートラリー"
  exit 1
fi

GAME_NAME="$1"

echo "================================================"
echo "ECNavi ゲームテスト: ${GAME_NAME}"
echo "================================================"

# Singleton ロックファイルを削除
echo "🧹 ブラウザプロファイルのロックファイルをクリーニング..."
find data/userdata -name "Singleton*" -type f -delete 2>/dev/null || true

# VNC付きでゲームを実行
echo "🚀 Docker コンテナ起動中..."
docker compose -f docker-compose.test.yaml run --rm \
  -e GAME_NAME="${GAME_NAME}" \
  app \
  sh -c "pnpm start -- --games=${GAME_NAME}"

echo ""
echo "================================================"
echo "テスト完了"
echo "================================================"
