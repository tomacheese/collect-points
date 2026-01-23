import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'

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

  await page.goto('https://ecnavi.jp/game/lottery/garapon/', {
    waitUntil: 'networkidle2',
  })
  await page.evaluate(() => {
    if (document.querySelector('p.bnr') != null) {
      document.querySelector('p.bnr')?.scrollIntoView()
    }
  })

  const anchers = await page.$$('p.bnr > a')
  for (const a of anchers) {
    const newPage = await getNewTabPage(context.logger, page, a)
    if (newPage == null) {
      continue
    }
    await sleep(1000)
    await newPage.close()
  }
}
