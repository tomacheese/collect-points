import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * 頭の体操ゲーム
 *
 * ecnavi.ib-game.jp/stamp にリダイレクトされる。
 * 脳トレゲームをプレイしてスタンプを獲得する。
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

  await page.goto('https://ecnavi.jp/brain_exercise_game/redirect/', {
    waitUntil: 'networkidle2',
  })

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("プレイ")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await smartClick(startButton, context.logger)
    await sleep(10_000)
  }

  await sleep(5000)
}
