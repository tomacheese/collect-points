import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * ゲソてん
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function gesoten(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('gesoten()')

  await page.goto('https://www.pointtown.com/gesoten/redirect', {
    waitUntil: 'networkidle2',
  })

  const games = await page.$$('li.c-card-game a')
  for (const game of games) {
    const url = await page.evaluate((element) => element.href, game)
    if (!url) {
      context.logger.error('url not found.')
      continue
    }
    const newPage = await page.browser().newPage()
    newPage.on('dialog', (dialog) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      dialog.accept().then(() => {
        context.logger.info('dialog accepted.')
      })
    })
    try {
      await newPage.goto(url, { waitUntil: 'networkidle2' })
    } catch (error) {
      context.logger.error('Error', error as Error)
    }
    await newPage.close()
  }
}
