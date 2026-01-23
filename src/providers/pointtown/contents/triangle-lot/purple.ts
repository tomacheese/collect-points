import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（紫）- クレジットカードページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotPurple(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotPurple()')
  await page.goto('https://www.pointtown.com/category/service/creditcard', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
