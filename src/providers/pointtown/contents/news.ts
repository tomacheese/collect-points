import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * ニュース閲覧
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function news(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('news()')

  await page.goto('https://www.pointtown.com/news/infoseek', {
    waitUntil: 'networkidle2',
  })

  if ((await context.checkNewsCoin(page)) === 0) {
    context.logger.info('news coin is 0.')
    return
  }

  const links = await page.$$(
    'a.js-news-infoseek-article-link[data-is-completed="false"]'
  )
  for (const link of links.slice(0, 20)) {
    const url = await page.evaluate((element) => element.href, link)
    if (!url) {
      context.logger.error('url not found.')
      continue
    }
    const newPage = await page.browser().newPage()
    try {
      await newPage.goto(url, { waitUntil: 'networkidle2' })
    } catch (error) {
      context.logger.error('Error', error as Error)
    }
    await newPage.close()
  }

  const buttons = await page.$$('button.js-news-infoseek-article-submit')
  context.logger.info(`buttons.length: ${buttons.length}`)

  for (let index = 0; index < buttons.length; index++) {
    context.logger.info(`click index: ${index}`)
    const buttonList = await page.$$(`button.js-news-infoseek-article-submit`)
    const button = buttonList[index]
    // styleがnoneではないこと
    const style = await page.evaluate(
      (element) => element.style.display,
      button
    )
    if (style === 'none') {
      continue
    }
    await button.evaluate((element) => {
      element.scrollIntoView()
    }, button)
    await Promise.all([
      button.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]).catch(() => null)

    if ((await context.checkNewsCoin(page)) === 0) {
      context.logger.info('news coin is 0.')
      return
    }
  }
}
