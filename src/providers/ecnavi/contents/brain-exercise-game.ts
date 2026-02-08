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

  // ゲーム開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('button')
      ) as HTMLElement[]
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
    await sleep(10_000)
  }

  await sleep(5000)
}
