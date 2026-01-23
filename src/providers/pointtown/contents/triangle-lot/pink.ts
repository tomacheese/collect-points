import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（ピンク）- 人気順ページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotPink(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotPink()')
  await page.goto('https://www.pointtown.com/popular/list/occurrence-count', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
