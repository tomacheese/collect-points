import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（赤）- ショッピングページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotRed(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotRed()')
  await page.goto('https://www.pointtown.com/ptu/shopping', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
