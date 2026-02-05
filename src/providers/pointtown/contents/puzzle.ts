import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * クラッシュアイス（パズル）
 *
 * gamebox.pointtown.com/puzzle にリダイレクトされる。
 * パズルゲームをプレイしてスタンプを獲得する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function puzzle(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('puzzle()')

  await page.goto('https://www.pointtown.com/game/redirect/puzzle', {
    waitUntil: 'networkidle2',
  })

  // 開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("挑戦"), button:has-text("はじめる"), button:has-text("スタート")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await smartClick(startButton, context.logger)
    await sleep(3000)
  }

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // ゲーム画面で待機（参加するだけでスタンプが貯まる）
  await sleep(10_000)
}
