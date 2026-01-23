import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 脳トレクイズ
 *
 * gamebox.pointtown.com/quiz にリダイレクトされ、クイズに回答してスタンプを集める。
 * 12個スタンプを集めると抽選でコインが当たる。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function brainTraining(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('brainTraining()')

  await page.goto('https://www.pointtown.com/quiz/redirect/brain-training', {
    waitUntil: 'networkidle2',
  })

  // 「つづきから」または「はじめる」ボタンをクリック
  const startButton = await page
    .waitForSelector(
      'a[href*="/quiz/question"], button:has-text("つづきから"), button:has-text("はじめる")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (startButton) {
    await startButton.click()
    await sleep(3000)
  }

  // クイズに回答（最大10問）
  for (let i = 0; i < 10; i++) {
    // 回答ボタンを探す
    const answerButtons = await page.$$(
      'button[class*="answer"], li[class*="choice"] button'
    )
    if (answerButtons.length === 0) {
      context.logger.info(
        '回答ボタンが見つかりません。クイズ終了または未開始。'
      )
      break
    }

    // ランダムに回答を選択
    const randomIndex = Math.floor(Math.random() * answerButtons.length)
    await answerButtons[randomIndex].click()
    await sleep(2000)

    // 次の問題へ進むボタンがあればクリック
    const nextButton = await page
      .$(
        'button:has-text("次へ"), button:has-text("次の問題"), a:has-text("次へ")'
      )
      .catch(() => null)
    if (nextButton) {
      await nextButton.click()
      await sleep(2000)
    }
  }

  await sleep(3000)
}
