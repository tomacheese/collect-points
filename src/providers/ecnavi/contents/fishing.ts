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

  // 広告オーバーレイによるクリック失敗を防ぐため JavaScript でクリック
  const gachaButton = await page.waitForSelector('#home .function button.gacha')
  if (gachaButton) {
    await gachaButton.evaluate((el) => {
      ;(el as HTMLElement).click()
    })
  }
  await sleep(5000)

  const startButton = await page.waitForSelector(
    '#home .gacha div.scene_1 button.common'
  )
  if (startButton) {
    await startButton.evaluate((el) => {
      ;(el as HTMLElement).click()
    })
  }
  await sleep(5000)

  // 結果ポップアップの「OK」ボタンをクリック
  // 広告オーバーレイによるクリック失敗を防ぐため JavaScript でクリック
  const okButtonSelector = '#home .gacha button.common'
  if (await isExistsSelector(page, okButtonSelector)) {
    const okButton = await page.waitForSelector(okButtonSelector)
    if (okButton) {
      await okButton.evaluate((el) => {
        ;(el as HTMLElement).click()
      })
    }
    await sleep(2000)
  }
}
