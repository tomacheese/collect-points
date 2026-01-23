import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * チョイス（投票）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function choice(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('choice()')

  await page.goto('https://ecnavi.jp/vote/choice/', {
    waitUntil: 'networkidle2',
  })

  if (!(await isExistsSelector(page, 'ul.answer_botton button'))) {
    return
  }

  await page
    .waitForSelector('ul.answer_botton button')
    .then((element) => element?.click())
  await sleep(3000)
}
