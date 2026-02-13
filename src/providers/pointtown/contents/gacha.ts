import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ガチャ（スマホ専用）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function gacha(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('gacha()')

  await page.emulate(KnownDevices['iPhone 12 Pro'])

  await safeGoto(page, 'https://www.pointtown.com/gacha/play', context.logger, {
    preferNetworkIdle: true,
  })
  await sleep(10_000)
}
