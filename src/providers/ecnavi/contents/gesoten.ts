import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

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

  await page.goto('https://ecnavi.jp/gesoten/redirect/', {
    waitUntil: 'networkidle2',
  })

  await page.goto('https://gd.gesoten.com/m/ap-ecnavi-games/reward/gacha', {
    waitUntil: 'networkidle2',
  })

  const games = await page.$$(
    'ul#reward-gacha-mission-game-contents div.c-gacha-list-card__action a'
  )
  for (const game of games) {
    const url = await page.evaluate((element) => element.href, game)
    context.logger.info(`open ${url}`)

    const newPage = await page.browser().newPage()
    await newPage.goto(url, {
      waitUntil: 'networkidle2',
    })
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
    await page.goto('https://gd.gesoten.com/reward/gacha', {
      waitUntil: 'networkidle2',
    })
  }
}
