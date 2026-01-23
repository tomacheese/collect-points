import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

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

  await page.goto('https://www.pointtown.com/fortune/omikuji/drawing', {
    waitUntil: 'networkidle2',
  })
  await sleep(10_000)
}
