import fs from 'node:fs'
import EcNaviCrawler from './providers/ecnavi'

async function main() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data')
  }
  // eslint-disable-next-line no-console
  process.on('unhandledRejection', console.dir)

  const crawlers = [/* new PointTownCrawler(), */ new EcNaviCrawler()]

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
}

;(async () => {
  main()
})()
