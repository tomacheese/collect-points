import fs from 'node:fs'
import PointTownCrawler from './providers/pointtown'
;(async () => {
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data')
  }
  // eslint-disable-next-line no-console
  process.on('unhandledRejection', console.dir)

  const crawler = new PointTownCrawler()
  // await crawler.run(PointTownCrawler.prototype.triangleLot)
  await crawler.run()
})()
