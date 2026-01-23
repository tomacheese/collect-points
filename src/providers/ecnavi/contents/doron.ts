import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'

/**
 * どろん
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function doron(context: EcNaviContext, page: Page): Promise<void> {
  context.logger.info('doron()')

  await page.goto('https://ecnavi.jp/contents/doron/', {
    waitUntil: 'networkidle2',
  })

  await page.waitForSelector('ul.character-tanuki a').then(async (element) => {
    const newPage = await getNewTabPage(context.logger, page, element)
    if (newPage == null) {
      return
    }
    await sleep(1000)
    await newPage.close()
    await sleep(1000)
  })

  await page.waitForSelector('ul.character-kitsune a').then(async (element) => {
    const newPage = await getNewTabPage(context.logger, page, element)
    if (newPage == null) {
      return
    }
    await sleep(1000)
    await newPage.close()
    await sleep(1000)
  })
}
