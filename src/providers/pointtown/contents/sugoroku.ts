import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * すごろくを実行する
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function sugoroku(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('sugoroku()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/game/redirect/sugoroku',
    context.logger
  )

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // サイコロを振るボタンをクリック
  const clicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button')]
      const button = elements.find(
        (el) =>
          el.textContent?.includes('サイコロ') ||
          el.textContent?.includes('振る') ||
          el.textContent?.includes('スタート')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('sugoroku: サイコロボタンをクリック')
    await sleep(5000) // アニメーション待機
  } else {
    context.logger.warn('sugoroku: サイコロボタンが見つかりません')
  }

  await sleep(5000)
}
