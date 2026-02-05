import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ふるふるパニック（ドロップゲーム）を実行する
 *
 * marketplace 提供のゲームでは、広告のリアルタイム読み込みや WebSocket 接続が
 * 継続的に行われるため networkidle2 ではタイムアウトしやすい。
 * safeGoto を使用してタイムアウト時も処理を継続する。
 *
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function dropgame(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('dropgame()')

  // marketplace ゲームは広告読み込み等でネットワークアイドルにならないため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/game/redirect/marketplace/dropgame',
    context.logger
  )

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // ゲーム開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("プレイ")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(10_000) // ゲームプレイ待機
  }

  await sleep(5000)
}
