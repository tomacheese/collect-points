import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

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

  await safeGoto(page, 'https://ecnavi.jp/game/lottery/', context.logger)

  // 現在の URL をログ出力
  context.logger.info(`entryLottery: 現在の URL: ${page.url()}`)

  if (await isExistsSelector(page, 'p.btn_entry a')) {
    context.logger.info('entryLottery: エントリーボタンをクリック')
    await page
      .waitForSelector('p.btn_entry a')
      .then((element) => element?.click())
    await sleep(5000)
    context.logger.info('entryLottery: 処理完了')
  } else {
    context.logger.info(
      'entryLottery: エントリーボタンが見つかりません（既にエントリー済み）'
    )
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        linkCount: document.querySelectorAll('a').length,
        bodyText: document.body.textContent.slice(0, 200),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `entryLottery: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }
}
