import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ナツポイ
 *
 * ecnavi.natsupoi.com にリダイレクトされる。
 * ゲームをプレイしてポイントを獲得する。
 *
 * リダイレクト先のゲームページでは、広告のリアルタイム読み込みや WebSocket 接続などが
 * 継続的に行われるため networkidle2 ではタイムアウトしやすい。
 * そのため waitUntil: 'load' を使用し、タイムアウト時も処理を継続する（Issue #410）。
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

  // ゲームページは広告読み込み等でネットワークアイドルにならないため、
  // load イベントで待機し、タイムアウトしても処理を継続する
  try {
    await page.goto('https://ecnavi.jp/natsupoi/redirect/', {
      waitUntil: 'load',
      timeout: 30_000,
    })
  } catch (error) {
    // ナビゲーションタイムアウト時もゲーム画面は表示されている可能性が高いため継続
    context.logger.warn(
      `ページ遷移でタイムアウトが発生しましたが処理を継続します: ${error instanceof Error ? error.message : String(error)}`
    )
  }

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
