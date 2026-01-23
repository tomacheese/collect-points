import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 脳トレクイズ
 *
 * ecnavi.kantangame.com/quiz にリダイレクトされる。
 * クイズに回答してスタンプを獲得する。
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

  await page.goto('https://ecnavi.jp/brain_training/redirect/', {
    waitUntil: 'networkidle2',
  })

  // 開始ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'button:has-text("つづきから"), button:has-text("はじめる"), a:has-text("挑戦")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
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

    // 次へボタン
    const nextButton = await page
      .$('button:has-text("次へ"), a:has-text("次へ")')
      .catch(() => null)
    if (nextButton) {
      await nextButton.click()
      await sleep(2000)
    }
  }

  await sleep(3000)
}
