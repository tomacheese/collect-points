import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { safeGoto } from '@/utils/safe-operations'

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

  await safeGoto(
    page,
    'https://www.pointtown.com/fortune/horoscope/detail',
    context.logger,
    {
      preferNetworkIdle: true,
    }
  )
  await page
    .waitForSelector('button.horoscope-btn[type="submit"]')
    .then((element) => element?.click())
}
