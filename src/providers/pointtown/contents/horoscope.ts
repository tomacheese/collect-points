import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * 星占い（スマホ専用）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function horoscope(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('horoscope()')

  await page.emulate(KnownDevices['iPhone 12 Pro'])

  await page.goto('https://www.pointtown.com/fortune/horoscope/detail', {
    waitUntil: 'networkidle2',
  })
  await page
    .waitForSelector('button.horoscope-btn[type="submit"]')
    .then((element) => element?.click())
}
