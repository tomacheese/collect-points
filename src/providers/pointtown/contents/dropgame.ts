import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ふるふるパニック（ドロップゲーム）を実行する
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function dropgame(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('dropgame()')

  await page.goto(
    'https://www.pointtown.com/game/redirect/marketplace/dropgame',
    {
      waitUntil: 'networkidle2',
    }
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
