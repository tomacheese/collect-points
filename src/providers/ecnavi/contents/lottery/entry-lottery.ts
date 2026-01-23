import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * 宝くじエントリー
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function entryLottery(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('entryLottery()')

  await page.goto('https://ecnavi.jp/game/lottery/', {
    waitUntil: 'networkidle2',
  })

  if (await isExistsSelector(page, 'p.btn_entry a')) {
    await page
      .waitForSelector('p.btn_entry a')
      .then((element) => element?.click())
    await sleep(5000)
  }
}
