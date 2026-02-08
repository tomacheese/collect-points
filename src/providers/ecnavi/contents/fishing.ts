import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 釣りパンダガチャ
 *
 * ゲームフロー:
 * 1. https://ecnavi.jp/game/fishing/play/ にアクセス
 * 2. 「釣りに行く」ボタンをクリック
 * 3. ゲームが自動実行される（15-20秒）
 * 4. 結果画面が表示される
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function fishing(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('fishing()')

  // 1. ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(page, 'https://ecnavi.jp/game/fishing/play/', context.logger)
  await sleep(3000)

  // 現在のURLをログに出力
  context.logger.info(`fishing: 現在のURL: ${page.url()}`)

  // 2. 「釣りに行く」ボタンをクリック（visible: true のボタン）
  const clicked = await page
    .evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
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
    context.logger.warn('fishing: 「釣りに行く」ボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allButtons = [...document.querySelectorAll('button')]
        return {
          url: globalThis.location.href,
          title: document.title,
          buttonCount: allButtons.length,
          buttonTexts: allButtons
            .map((b) => b.textContent?.trim())
            .slice(0, 10),
        }
      })
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(`fishing: デバッグ情報: ${JSON.stringify(debugInfo)}`)
    }
    return
  }

  context.logger.info('fishing: 釣りゲームを開始しました')

  // 3. ゲームが自動実行されるのを待つ
  await sleep(20_000)

  context.logger.info('fishing: 釣りゲーム完了')
}
