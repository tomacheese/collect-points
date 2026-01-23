import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * ポイント争奪戦
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function competition(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('competition()')
  await page.goto('https://www.pointtown.com/soudatsu', {
    waitUntil: 'networkidle2',
  })
  try {
    await Promise.all([
      page
        .waitForSelector('main form button[type="submit"]', {
          visible: true,
          timeout: 3000,
        })
        .then((element) => element?.click()),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ])
  } catch (error) {
    context.logger.info((error as Error).message)
  }
}
