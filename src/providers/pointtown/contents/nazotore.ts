import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 今夜はナゾトレ
 *
 * gamebox.pointtown.com/nazotore にリダイレクトされる。
 * 謎解きクイズに回答してスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function nazotore(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('nazotore()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/nazotore/redirect',
    context.logger
  )

  // 開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("挑戦"), button:has-text("はじめる"), a:has-text("挑戦")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // クイズに回答（回答ボタンがあれば）
  for (let i = 0; i < 5; i++) {
    const answerButtons = await page.$$(
      'button[class*="answer"], button[class*="choice"]'
    )
    if (answerButtons.length === 0) break

    const randomIndex = Math.floor(Math.random() * answerButtons.length)
    await answerButtons[randomIndex].click()
    await sleep(3000)
  }

  await sleep(3000)
}
