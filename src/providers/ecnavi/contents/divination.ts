import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 占い
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function divination(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('divination()')

  await page.goto('https://ecnavi.jp/contents/divination/western_astrology/', {
    waitUntil: 'networkidle2',
  })

  await page
    .waitForSelector('ul.western-astrology-list button')
    .then((element) => element?.click())
  await sleep(3000)

  await page.goto('https://ecnavi.jp/contents/divination/tarot/', {
    waitUntil: 'networkidle2',
  })

  await page
    .waitForSelector('ul.draw-tarot button')
    .then((element) => element?.click())
  await sleep(3000)

  await page.goto('https://ecnavi.jp/contents/divination/omikuji/', {
    waitUntil: 'networkidle2',
  })

  await page
    .waitForSelector('button.draw-omikuji__button')
    .then((element) => element?.click())
  await sleep(10_000)
}
