import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 語学トラベル
 *
 * 英語学習クイズでポイントを獲得する。
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function languageTravel(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('languageTravel()')

  await page.goto('https://ecnavi.jp/contents/language_travel/', {
    waitUntil: 'networkidle2',
  })

  // クイズ開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("スタート"), button:has-text("はじめる"), a:has-text("挑戦")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  // クイズに回答
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
