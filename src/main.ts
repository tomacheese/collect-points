import fs from 'node:fs'
import { getGitHash } from './git'
import EcNaviCrawler from './providers/ecnavi'
import PointTownCrawler from './providers/pointtown'
import rollbar from 'rollbar'

async function main() {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data')
  }
  // eslint-disable-next-line no-console
  process.on('unhandledRejection', console.dir)

  rollbar.init({
    accessToken: '0ca82974fc6d490f82337f06f9bf2751',
    environment: process.env.NODE_ENV,
    codeVersion: getGitHash(),
    captureUncaught: true,
    captureUnhandledRejections: true,
  })

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
}

;(async () => {
  main()
})()
