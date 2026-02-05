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
  const drawButton = await page
    .waitForSelector(
      'button:has-text("くじを引く"), button:has-text("動画を見る"), a:has-text("くじを引く")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (drawButton) {
    await drawButton.click()
    context.logger.info('CM動画再生開始、30秒待機')
    await sleep(30_000) // CM視聴待機

    // 動画終了後の閉じるボタン
    const closeButton = await page
      .waitForSelector(
        'button:has-text("閉じる"), button:has-text("結果を見る"), button[class*="close"]',
        { timeout: 10_000 }
      )
      .catch(() => null)

    if (closeButton) {
      await closeButton.click()
      await sleep(3000)
    }
  }

  await sleep(3000)
}
