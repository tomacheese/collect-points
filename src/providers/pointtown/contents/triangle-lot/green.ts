import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（緑）- 特集ページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotGreen(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotGreen()')
  await page.goto('https://www.pointtown.com/feature', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
