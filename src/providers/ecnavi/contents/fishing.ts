import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 釣りパンダガチャ
 *
 * ゲームフロー:
 * 1. https://ecnavi.jp/game/fishing/play/ にアクセス
 * 2. エサを選択（「選択」ボタンをクリック）
 * 3. 竿を選択（「選択」ボタンをクリック）
 * 4. 「釣りに行く」ボタンをクリック
 * 5. ゲームが自動実行される（15-20秒）
 * 6. 結果画面が表示される
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

  // 1. ゲームページにアクセス
  await safeGoto(page, 'https://ecnavi.jp/game/fishing/play/', context.logger)
  await sleep(3000)

  context.logger.info(`fishing: 現在のURL: ${page.url()}`)

  // 2. エサを選択
  const baitSelected = await page
    .evaluate(() => {
      // エサ選択画面の「選択」ボタンを探す（disabled でないもの）
      const selectButtons = Array.from(document.querySelectorAll('button'))
      const baitButton = selectButtons.find(
        (btn) =>
          btn.textContent?.trim() === '選択' &&
          !btn.disabled &&
          btn.offsetParent !== null
      )
      if (baitButton) {
        baitButton.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!baitSelected) {
    context.logger.warn('fishing: エサ選択ボタンが見つかりません')
    return
  }

  context.logger.info('fishing: エサを選択')
  await sleep(2000)

  // 3. 竿選択タブをクリック
  const rodTabClicked = await page
    .evaluate(() => {
      // 「竿」タブのリンクを探してクリック
      const links = Array.from(document.querySelectorAll('a'))
      const rodTab = links.find(
        (link) =>
          link.textContent?.trim() === '竿' && link.offsetParent !== null
      )
      if (rodTab) {
        rodTab.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!rodTabClicked) {
    context.logger.warn('fishing: 竿タブが見つかりません')
    return
  }

  context.logger.info('fishing: 竿タブをクリック')
  await sleep(2000)

  // 4. 竿を選択
  const rodSelected = await page
    .evaluate(() => {
      // 竿選択画面の「選択」ボタンを探す（disabled でないもの）
      const selectButtons = Array.from(document.querySelectorAll('button'))
      const rodButton = selectButtons.find(
        (btn) =>
          btn.textContent?.trim() === '選択' &&
          !btn.disabled &&
          btn.offsetParent !== null
      )
      if (rodButton) {
        rodButton.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!rodSelected) {
    context.logger.warn('fishing: 竿選択ボタンが見つかりません')
    return
  }

  context.logger.info('fishing: 竿を選択')
  await sleep(2000)

  // 5. 「釣りに行く」ボタンをクリック
  const goFishingButtonClicked = await page
    .evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const goFishingButton = buttons.find(
        (btn) =>
          btn.textContent?.includes('釣りに行く') && btn.offsetParent !== null
      )
      if (goFishingButton) {
        goFishingButton.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!goFishingButtonClicked) {
    context.logger.warn('fishing: 「釣りに行く」ボタンが見つかりません')
    return
  }

  context.logger.info('fishing: 釣りゲームを開始')

  // 6. ゲームが自動実行されるのを待つ（30秒待機）
  await sleep(30_000)

  context.logger.info('fishing: 釣りゲーム完了')
}
