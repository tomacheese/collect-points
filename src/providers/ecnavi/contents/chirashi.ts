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

  const chirashis = await page.$$('a.chirashi_link')
  for (const chirashi of chirashis.slice(0, 2)) {
    const url = await page.evaluate((element) => element.href, chirashi)
    context.logger.info(`open ${url}`)

    const newPage = await page.browser().newPage()
    await newPage.goto(url, {
      waitUntil: 'networkidle2',
    })
    await sleep(3000)
    await newPage.close()
  }
}
