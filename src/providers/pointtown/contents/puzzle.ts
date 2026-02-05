import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * クラッシュアイス（パズル）
 *
 * gamebox.pointtown.com/puzzle にリダイレクトされる。
 * パズルゲームをプレイしてスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function puzzle(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('puzzle()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/game/redirect/puzzle',
    context.logger
  )

  // 開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("挑戦"), button:has-text("はじめる"), button:has-text("スタート")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // ゲーム画面で待機（参加するだけでスタンプが貯まる）
  await sleep(10_000)
}
