import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 釣りパンダガチャ
 *
 * ゲームフロー:
 * 1. https://ecnavi.jp/game/fishing/play/ にアクセス
 * 2. 「釣りに行く」ボタンをクリック
 * 3. ゲームが自動実行される（15-20秒）
 * 4. 結果画面が表示される
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function fishing(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('fishing()')

  // 1. ゲームページにアクセス
  await page.goto('https://ecnavi.jp/game/fishing/play/', {
    waitUntil: 'networkidle2',
  })
  await sleep(3000)

  // 2. 「釣りに行く」ボタンをクリック（visible: true のボタン）
  const clicked = await page
    .evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const fishingButton = buttons.find(
        (btn) =>
          btn.textContent?.includes('釣りに行く') && btn.offsetParent !== null
      )
      if (fishingButton) {
        fishingButton.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!clicked) {
    context.logger.warn('「釣りに行く」ボタンが見つかりません')
    return
  }

  context.logger.info('釣りゲームを開始しました')

  // 3. ゲームが自動実行されるのを待つ
  await sleep(20_000)

  context.logger.info('釣りゲーム完了')
}
