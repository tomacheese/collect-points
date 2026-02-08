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
  const clicked = await page
    .evaluate(() => {
      const elements = [
        ...document.querySelectorAll('button, a'),
      ] as HTMLElement[]
      const button = elements.find(
        (el) =>
          el.textContent?.includes('挑戦') ||
          el.textContent?.includes('はじめる')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('nazotore: 開始ボタンをクリック')
    await sleep(3000)
  } else {
    context.logger.warn('nazotore: 開始ボタンが見つかりません')
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
