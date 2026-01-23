import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 三角くじ（黄）- アンケートページ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLotYellow(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLotYellow()')
  await page.goto('https://www.pointtown.com/enquete', {
    waitUntil: 'networkidle2',
  })

  await context.checkTriangleLot(page)
}
