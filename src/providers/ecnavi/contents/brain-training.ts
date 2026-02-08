import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 脳トレクイズ
 *
 * ecnavi.kantangame.com/quiz にリダイレクトされる。
 * クイズに回答してスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function brainTraining(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('brainTraining()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://ecnavi.jp/brain_training/redirect/',
    context.logger
  )

  // 開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const startClicked = await page
    .evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('button, a')
      ) as HTMLElement[]
      const button = elements.find(
        (el) =>
          el.textContent?.includes('つづきから') ||
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

  if (startClicked) {
    await sleep(3000)
  }

  // 広告があれば視聴
  await watchAdIfExists(page)

  // クイズに回答
  for (let i = 0; i < 10; i++) {
    const answerButtons = await page.$$(
      'button[class*="answer"], li[class*="choice"] button'
    )
    if (answerButtons.length === 0) break

    const randomIndex = Math.floor(Math.random() * answerButtons.length)
    await answerButtons[randomIndex].click()
    await sleep(2000)

    // 次へボタン（JavaScript でテキストを含む要素を探す）
    const nextClicked = await page
      .evaluate(() => {
        const elements = Array.from(
          document.querySelectorAll('button, a')
        ) as HTMLElement[]
        const button = elements.find((el) => el.textContent?.includes('次へ'))
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch(() => false)
    if (nextClicked) {
      await sleep(2000)
    }
  }

  await sleep(3000)
}
