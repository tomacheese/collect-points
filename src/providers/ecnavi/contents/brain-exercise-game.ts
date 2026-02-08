import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 頭の体操ゲーム
 *
 * ecnavi.ib-game.jp/stamp にリダイレクトされる。
 * 脳トレゲームをプレイしてスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function brainExerciseGame(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('brainExerciseGame()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://ecnavi.jp/brain_exercise_game/redirect/',
    context.logger
  )

  // 広告があれば視聴
  await watchAdIfExists(page)

  // 現在のURLをログに出力
  context.logger.info(`brainExerciseGame: 現在のURL: ${page.url()}`)

  // ゲーム開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button'))
      const button = elements.find(
        (el) =>
          el.textContent?.includes('スタート') ||
          el.textContent?.includes('はじめる') ||
          el.textContent?.includes('プレイ')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('brainExerciseGame: ゲーム開始ボタンをクリック')
    // ゲーム開始後の待機（広告視聴やゲームプレイ）
    await sleep(10_000)
    context.logger.info('brainExerciseGame: ゲーム待機完了')
  } else {
    context.logger.warn('brainExerciseGame: ゲーム開始ボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'))
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
      context.logger.info(
        `brainExerciseGame: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }

  await sleep(5000)
}
