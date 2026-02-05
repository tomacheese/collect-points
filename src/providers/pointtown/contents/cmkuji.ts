import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * CM くじを引く
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function cmkuji(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('cmkuji()')

  await page.goto('https://www.pointtown.com/cmkuji/redirect', {
    waitUntil: 'networkidle2',
  })

  // くじを引くボタンをクリック
  const drawButton = await page
    .waitForSelector(
      'button:has-text("くじを引く"), button:has-text("動画を見る"), a:has-text("くじを引く")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (drawButton) {
    await smartClick(drawButton, context.logger)
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
      await smartClick(closeButton, context.logger)
      await sleep(3000)
    }
  }

  await sleep(3000)
}
