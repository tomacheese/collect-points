import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * CM くじを引く
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function cmkuji(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('cmkuji()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/cmkuji/redirect',
    context.logger
  )

  // くじを引くボタンをクリック
  const clicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button, a')] as HTMLElement[]
      const button = elements.find(
        (el) =>
          el.textContent?.includes('くじを引く') ||
          el.textContent?.includes('動画を見る')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info(
      'cmkuji: くじを引くボタンをクリック、CM動画再生開始、30秒待機'
    )
    await sleep(30_000) // CM視聴待機

    // 動画終了後の閉じるボタン
    const closedClicked = await page
      .evaluate(() => {
        const elements = [...document.querySelectorAll('button')]
        const button = elements.find(
          (el) =>
            el.textContent?.includes('閉じる') ||
            el.textContent?.includes('結果を見る') ||
            el.className.includes('close')
        )
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch(() => false)

    if (closedClicked) {
      context.logger.info('cmkuji: 閉じるボタンをクリック')
      await sleep(3000)
    } else {
      context.logger.warn('cmkuji: 閉じるボタンが見つかりません')
    }
  } else {
    context.logger.warn('cmkuji: くじを引くボタンが見つかりません')
  }

  await sleep(3000)
}
