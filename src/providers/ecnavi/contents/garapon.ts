import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ガラポン
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function garapon(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('garapon()')

  await safeGoto(
    page,
    'https://ecnavi.jp/game/lottery/garapon/',
    context.logger
  )

  // 現在の URL をログ出力
  context.logger.info(`garapon: 現在の URL: ${page.url()}`)

  await page.evaluate(() => {
    if (document.querySelector('p.bnr') != null) {
      document.querySelector('p.bnr')?.scrollIntoView()
    }
  })

  const anchers = await page.$$('p.bnr > a')
  context.logger.info(`garapon: バナーリンク数: ${anchers.length}`)

  if (anchers.length === 0) {
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        bnrCount: document.querySelectorAll('p.bnr').length,
        linkCount: document.querySelectorAll('a').length,
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(`garapon: デバッグ情報: ${JSON.stringify(debugInfo)}`)
    }
  }

  for (const a of anchers) {
    const newPage = await getNewTabPage(context.logger, page, a)
    if (newPage == null) {
      continue
    }
    await sleep(1000)
    await newPage.close()
  }

  context.logger.info('garapon: 処理完了')
}
