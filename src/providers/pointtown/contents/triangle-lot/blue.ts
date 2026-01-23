import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（青）- 最近見た広告ページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotBlue(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotBlue()')
  await page.goto('https://www.pointtown.com/recent', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
