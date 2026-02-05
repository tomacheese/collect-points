import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ナツポイ
 *
 * ecnavi.natsupoi.com にリダイレクトされる。
 * ゲームをプレイしてポイントを獲得する。
 *
 * リダイレクト先のゲームページでは、広告のリアルタイム読み込みや WebSocket 接続などが
 * 継続的に行われるため networkidle2 ではタイムアウトしやすい。
 * safeGoto を使用してタイムアウト時も処理を継続する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function natsupoi(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('natsupoi()')

  // ゲームページは広告読み込み等でネットワークアイドルにならないため safeGoto を使用
  await safeGoto(page, 'https://ecnavi.jp/natsupoi/redirect/', context.logger)

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
    await startButton.click()
    await sleep(10_000)
  }

  await sleep(5000)
}
