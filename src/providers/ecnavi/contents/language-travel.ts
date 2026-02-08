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

  // クイズ開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('button, a')
      ) as HTMLElement[]
      const button = elements.find(
        (el) =>
          el.textContent?.includes('スタート') ||
          el.textContent?.includes('はじめる') ||
          el.textContent?.includes('挑戦')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
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
