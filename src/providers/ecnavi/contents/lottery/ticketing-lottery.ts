import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 宝くじ一括応募
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function ticketingLottery(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('ticketingLottery()')

  await page.goto('https://ecnavi.jp/game/lottery/', {
    waitUntil: 'networkidle2',
  })
  await page
    .waitForSelector('p.btn_ikkatsu')
    .then((element) => element?.click())
    .catch(() => null)
  await sleep(1000)
}
