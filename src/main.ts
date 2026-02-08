import fs from 'node:fs'
import { getVersion } from '@/utils/version'
import EcNaviCrawler from '@/providers/ecnavi'
import PointTownCrawler from '@/providers/pointtown'
import { Logger } from '@book000/node-utils'
import * as Sentry from '@sentry/node'

async function main() {
  const logger = Logger.configure('main')

  // バージョン情報をログ出力
  const version = getVersion()
  logger.info(
    `🚀 collect-points ${version ? `v${version}` : 'unknown version'} を起動します`
  )

  // Docker 環境では /data にマウントされているため、ローカルの data ディレクトリは不要
  if (!fs.existsSync('data') && !fs.existsSync('/data')) {
    fs.mkdirSync('data')
  }

  if (process.env.SENTRY_DSN) {
    logger.info('🔄 Initializing Sentry...')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: version,
    })
  }

  // コマンドライン引数を解析
  const args = process.argv.slice(2)
  const gamesFilter: string[] | undefined = args
    .find((arg) => arg.startsWith('--games='))
    ?.split('=')[1]
    ?.split(',')
    .map((game) => game.trim())

  if (gamesFilter && gamesFilter.length > 0) {
    logger.info(`🎯 個別実行モード: ${gamesFilter.join(', ')}`)
  }

  // ECNavi 専用ゲームのリスト
  const ecnaviOnlyGames = new Set([
    'fishing',
    'entryLottery',
    'gesoten',
    'chirashi',
    'chinju',
    'quiz',
    'divination',
    'choice',
    'news',
    'garapon',
    'doron',
    'ticketingLottery',
    'fund',
    'natsupoi',
    'languageTravel',
    'brainExerciseGame',
    'easyGame',
    'brainTraining',
    'vegetable',
    'chocoRead',
    'enqueteRally',
  ])

  // フィルタリングされたゲームが ECNavi 専用かどうかを判定
  const isEcNaviOnly =
    gamesFilter &&
    gamesFilter.length > 0 &&
    gamesFilter.every((game) => ecnaviOnlyGames.has(game))

  // 適切なクローラーのみを実行
  const crawlers = isEcNaviOnly
    ? [new EcNaviCrawler(gamesFilter)]
    : [new PointTownCrawler(gamesFilter), new EcNaviCrawler(gamesFilter)]

  // ログイン処理だけ先に済ませる
  if (process.env.ENABLE_LOGIN === 'true') {
    for (const crawler of crawlers) {
      await crawler.loginOnly()
    }
  }

  // クローリング処理
  for (const crawler of crawlers) {
    await crawler.run()
  }

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0)
}

;(async () => {
  await main().catch((error: unknown) => {
    const logger = Logger.configure('main')
    logger.error('Error', error as Error)
    Sentry.captureException(error)
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  })
})()
