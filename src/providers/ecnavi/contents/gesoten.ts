import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * げそてん
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function gesoten(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('gesoten()')

  await safeGoto(page, 'https://ecnavi.jp/gesoten/redirect/', context.logger)
  context.logger.info(`gesoten: リダイレクト後の URL: ${page.url()}`)

  await safeGoto(
    page,
    'https://gd.gesoten.com/m/ap-ecnavi-games/reward/gacha',
    context.logger
  )
  context.logger.info(`gesoten: ガチャページの URL: ${page.url()}`)

  const games = await page.$$('a[href*="/games/regist/"]')
  context.logger.info(`gesoten: ゲームリンク数: ${games.length}`)

  if (games.length === 0) {
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
      context.logger.info(`gesoten: デバッグ情報: ${JSON.stringify(debugInfo)}`)
    }
  }

  for (const game of games) {
    const url = await page.evaluate((element) => element.href, game)
    context.logger.info(`gesoten: ゲームを開く: ${url}`)

    const newPage = await page.browser().newPage()
    await safeGoto(newPage, url, context.logger)
    await sleep(3000)
    await newPage.close()
  }

  while (true) {
    if (!(await isExistsSelector(page, 'button.c-gacha-ticket__action'))) {
      break
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button.c-gacha-ticket__action'),
    ])
    await sleep(3000)
    await safeGoto(page, 'https://gd.gesoten.com/reward/gacha', context.logger)
  }
}
