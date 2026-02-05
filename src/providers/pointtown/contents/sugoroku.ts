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
  const diceButton = await page
    .waitForSelector(
      'button:has-text("サイコロ"), button:has-text("振る"), button:has-text("スタート")',
      { timeout: 5000 }
    )
    .catch(() => null)

  if (diceButton) {
    await diceButton.click()
    await sleep(5000) // アニメーション待機
  }

  await sleep(5000)
}
