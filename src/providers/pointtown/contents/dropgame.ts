import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * ふるふるパニック（ドロップゲーム）を実行する
 *
 * marketplace 提供のゲームでは、広告のリアルタイム読み込みや WebSocket 接続が
 * 継続的に行われるため networkidle2 ではタイムアウトしやすい。
 * そのため waitUntil: 'load' を使用し、タイムアウト時も処理を継続する。
 *
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function dropgame(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('dropgame()')

  // marketplace ゲームは広告読み込み等でネットワークアイドルにならないため、
  // load イベントで待機し、タイムアウトしても処理を継続する
  try {
    await page.goto(
      'https://www.pointtown.com/game/redirect/marketplace/dropgame',
      {
        waitUntil: 'load',
        timeout: 30_000,
      }
    )
  } catch (error) {
    // ナビゲーションタイムアウト時もゲーム画面は表示されている可能性が高いため継続
    context.logger.warn(
      `ページ遷移でタイムアウトが発生しましたが処理を継続します: ${error instanceof Error ? error.message : String(error)}`
    )
  }

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
    await smartClick(startButton, context.logger)
    await sleep(10_000) // ゲームプレイ待機
  }

  await sleep(5000)
}
