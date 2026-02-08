import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * 釣りゲーム
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function fishing(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('fishing()')

  await page.goto('https://ecnavi.jp/game/fishing/play/', {
    waitUntil: 'networkidle2',
  })

  if (!(await isExistsSelector(page, '#home .function button.gacha'))) {
    return
  }

  await page
    .waitForSelector('#home .function button.gacha')
    .then((element) => element?.click())
  await sleep(5000)

  await page
    .waitForSelector('#home .gacha div.scene_1 button.common')
    .then((element) => element?.click())
  await sleep(5000)

  // 結果ポップアップの「OK」ボタンをクリック
  // ポップアップが表示されるまで待機し、ボタンをクリック
  const okButtonSelector = '#home .gacha button.common'
  if (await isExistsSelector(page, okButtonSelector)) {
    await page
      .waitForSelector(okButtonSelector)
      .then((element) => element?.click())
    await sleep(2000)
  }
}
