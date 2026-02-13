import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * おみくじ（スマホ専用）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function omikuji(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('omikuji()')

  await page.emulate(KnownDevices['iPhone 12 Pro'])

  await safeGoto(
    page,
    'https://www.pointtown.com/fortune/omikuji/drawing',
    context.logger,
    {
      preferNetworkIdle: true,
    }
  )
  await sleep(10_000)
}
