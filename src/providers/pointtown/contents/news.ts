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

  // 最大20記事分の報酬を受け取る
  for (let processedCount = 0; processedCount < 20; processedCount++) {
    context.logger.info(`Processing reward: ${processedCount + 1}/20`)

    // 毎回ボタンリストを再取得（ページリロード後にDOMが変わるため）
    const buttons = await page.$$('button.js-news-infoseek-article-submit')

    // 表示されている（style.display !== 'none'）最初のボタンを探す
    let targetButton = null
    for (const button of buttons) {
      const style = await page.evaluate(
        (element) => element.style.display,
        button
      )
      if (style !== 'none') {
        targetButton = button
        break
      }
    }

    if (!targetButton) {
      context.logger.info('No more clickable buttons found.')
      break
    }

    // ボタンを画面内にスクロール
    await targetButton.evaluate((element) => {
      element.scrollIntoView()
    })

    // ボタンをクリックして報酬を受け取る（ページリロードが発生する）
    await Promise.all([
      targetButton.click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]).catch(() => null)

    // 未取得報酬を確認
    const remainingCoin = await context.checkNewsCoin(page)
    if (remainingCoin === null) {
      context.logger.warn('Failed to get remaining coin count.')
      continue
    }
    if (remainingCoin === 0) {
      context.logger.info('All rewards claimed. Remaining coin: 0')
      return
    }
    context.logger.info(`Remaining coin: ${remainingCoin}`)
  }
}
