import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

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

  await page.goto('https://www.pointtown.com/gacha/play', {
    waitUntil: 'networkidle2',
  })
  await sleep(10_000)
}
