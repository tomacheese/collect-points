import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ニュース記事を閲覧してリアクションボタンをクリックする
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function news(context: EcNaviContext, page: Page): Promise<void> {
  context.logger.info('news()')

  await page.goto('https://ecnavi.jp/mainichi_news/#goog_rewarded', {
    waitUntil: 'networkidle2',
  })
  const items = await page.$$(
    'li.article-latest-item a.article-latest-item__link'
  )
  for (const [index, item] of items.slice(0, 5).entries()) {
    const url = await page.evaluate((element) => element.href, item)
    context.logger.info(`news[${index + 1}/5]: Opening ${url}`)

    const newsPage = await page.browser().newPage()
    await newsPage.goto(url, {
      waitUntil: 'networkidle2',
    })

    // デバッグ: ページ状態をログ出力
    const pageUrl = newsPage.url()
    context.logger.info(`news[${index + 1}/5]: Page loaded, URL=${pageUrl}`)

    await newsPage.evaluate(() => {
      if (document.querySelector('p.article-reaction-status') != null) {
        document.querySelector('p.article-reaction-status')?.scrollIntoView()
      }
    })

    await newsPage
      .waitForSelector('button.article-reaction__feeling-button')
      .then((element) => element?.click())
      .catch(() => null)
    await sleep(3000)

    // デバッグ: クローズ前の状態を確認
    const isClosed = newsPage.isClosed()
    context.logger.info(
      `news[${index + 1}/5]: Before close - isClosed=${isClosed}`
    )

    // タブが既に閉じている場合はスキップ
    if (isClosed) {
      context.logger.warn(
        `news[${index + 1}/5]: Page was already closed, skipping close()`
      )
    } else {
      await newsPage.close()
      context.logger.info(`news[${index + 1}/5]: Page closed successfully`)
    }
  }
}
