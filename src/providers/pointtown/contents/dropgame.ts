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
  const clicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button')]
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
    context.logger.info('dropgame: 開始ボタンをクリック')
    await sleep(10_000) // ゲームプレイ待機
  } else {
    context.logger.warn('dropgame: 開始ボタンが見つかりません')
  }

  await sleep(5000)
}
