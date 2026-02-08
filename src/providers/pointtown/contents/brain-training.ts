import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 脳トレクイズ
 *
 * gamebox.pointtown.com/quiz にリダイレクトされ、クイズに回答してスタンプを集める。
 * 12個スタンプを集めると抽選でコインが当たる。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function brainTraining(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('brainTraining()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/quiz/redirect/brain-training',
    context.logger
  )

  // 「つづきから」または「はじめる」ボタンをクリック
  const startClicked = await page
    .evaluate(() => {
      // a[href*="/quiz/question"] を探す
      const questionLink = document.querySelector('a[href*="/quiz/question"]')
      if (questionLink) {
        ;(questionLink as HTMLElement).click()
        return true
      }

      // ボタンを探す
      const elements = [...document.querySelectorAll('button')]
      const button = elements.find(
        (el) =>
          el.textContent.includes('つづきから') ||
          el.textContent.includes('はじめる')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (startClicked) {
    context.logger.info('brainTraining: 開始ボタンをクリック')
    await sleep(3000)
  } else {
    context.logger.warn('brainTraining: 開始ボタンが見つかりません')
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
    const nextClicked = await page
      .evaluate(() => {
        const elements = [
          ...document.querySelectorAll('button, a'),
        ] as HTMLElement[]
        const button = elements.find(
          (el) =>
            el.textContent.includes('次へ') ||
            el.textContent.includes('次の問題')
        )
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
