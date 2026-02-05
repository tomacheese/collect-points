import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * かんたんゲーム
 *
 * ecnavi.kantangame.com/easygame にリダイレクトされる。
 * シンプルなゲームをプレイしてスタンプを獲得する。
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function easyGame(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('easyGame()')

  await page.goto('https://ecnavi.jp/easy_game/redirect/', {
    waitUntil: 'networkidle2',
  })

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("挑戦")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await smartClick(startButton, context.logger)
    await sleep(10_000)
  }

  await sleep(5000)
}
