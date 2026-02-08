import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

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

  await safeGoto(page, 'https://ecnavi.jp/game/lottery/', context.logger)

  // 現在の URL をログ出力
  context.logger.info(`ticketingLottery: 現在の URL: ${page.url()}`)

  const ikkatsuButton = await page
    .waitForSelector('p.btn_ikkatsu', { timeout: 5000 })
    .catch(() => null)

  if (ikkatsuButton) {
    context.logger.info('ticketingLottery: 一括応募ボタンをクリック')
    await ikkatsuButton.click()
    await sleep(1000)
    context.logger.info('ticketingLottery: 処理完了')
  } else {
    context.logger.info(
      'ticketingLottery: 一括応募ボタンが見つかりません（チケットなし）'
    )
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        paragraphCount: document.querySelectorAll('p').length,
        bodyText: document.body.textContent?.slice(0, 200),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `ticketingLottery: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }
}
