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

  await page
    .waitForSelector('ul.click-fund-contents li:nth-child(1) a')
    .then(async (element) => {
      const newPage = await getNewTabPage(context.logger, page, element)
      if (newPage == null) {
        return
      }
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    })

  await page
    .waitForSelector('ul.click-fund-contents li:nth-child(2) a')
    .then(async (element) => {
      const newPage = await getNewTabPage(context.logger, page, element)
      if (newPage == null) {
        return
      }
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    })
}
