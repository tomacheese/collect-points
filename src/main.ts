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

  if (!fs.existsSync('data')) {
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

  const crawlers = [new PointTownCrawler(), new EcNaviCrawler()]

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
