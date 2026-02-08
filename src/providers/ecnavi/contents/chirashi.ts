import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * チラシ閲覧
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function chirashi(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('chirashi()')

  await page.goto('https://ecnavi.jp/contents/chirashi/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`chirashi: 現在の URL: ${page.url()}`)

  const chirashis = await page.$$('a.chirashi_link')
  context.logger.info(`chirashi: チラシリンク数: ${chirashis.length}`)

  if (chirashis.length === 0) {
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        linkCount: document.querySelectorAll('a').length,
        bodyText: document.body.textContent?.slice(0, 200),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `chirashi: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
    return
  }

  for (const chirashi of chirashis.slice(0, 2)) {
    const url = await page.evaluate((element) => element.href, chirashi)
    context.logger.info(`chirashi: チラシを開く: ${url}`)

    const newPage = await page.browser().newPage()
    await newPage.goto(url, {
      waitUntil: 'networkidle2',
    })
    await sleep(3000)
    await newPage.close()
  }

  context.logger.info('chirashi: 処理完了')
}
