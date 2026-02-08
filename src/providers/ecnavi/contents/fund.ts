import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'

/**
 * クリック募金
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function fund(context: EcNaviContext, page: Page): Promise<void> {
  context.logger.info('fund()')

  await page.goto('https://ecnavi.jp/smile_project/click_fund/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`fund: 現在の URL: ${page.url()}`)

  // 募金リンク 1
  const fundLink1 = await page
    .waitForSelector('ul.click-fund-contents li:nth-child(1) a', {
      timeout: 5000,
    })
    .catch(() => null)
  if (fundLink1) {
    context.logger.info('fund: 募金リンク 1 をクリック')
    const newPage = await getNewTabPage(context.logger, page, fundLink1)
    if (newPage != null) {
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    }
  } else {
    context.logger.warn('fund: 募金リンク 1 が見つかりません')
  }

  // 募金リンク 2
  const fundLink2 = await page
    .waitForSelector('ul.click-fund-contents li:nth-child(2) a', {
      timeout: 5000,
    })
    .catch(() => null)
  if (fundLink2) {
    context.logger.info('fund: 募金リンク 2 をクリック')
    const newPage = await getNewTabPage(context.logger, page, fundLink2)
    if (newPage != null) {
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    }
  } else {
    context.logger.warn('fund: 募金リンク 2 が見つかりません')
  }

  context.logger.info('fund: 処理完了')
}
