import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * まちがい探し
 *
 * gamebox.pointtown.com/spotdiff にリダイレクトされる。
 * 「挑戦する」→ 広告視聴 → ゲームプレイでルーペを獲得。
 * 100個ルーペを集めると抽選でコインが当たる。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function spotdiff(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('spotdiff()')

  await page.goto('https://www.pointtown.com/game/redirect/spotdiff', {
    waitUntil: 'networkidle2',
  })

  // 「挑戦する」ボタンをクリック
  const challengeButton = await page
    .waitForSelector('button:has-text("挑戦する"), a:has-text("挑戦する")', {
      timeout: 5000,
    })
    .catch(() => null)

  if (challengeButton) {
    await challengeButton.click()
    await sleep(3000)
  }

  // 広告を再生して開始するボタンがあればクリック
  const adButton = await page
    .waitForSelector(
      'button:has-text("広告を再生"), button:has-text("広告を見て")',
      {
        timeout: 5000,
      }
    )
    .catch(() => null)

  if (adButton) {
    await adButton.click()
    context.logger.info('広告再生開始、30秒待機')
    await sleep(30_000) // 広告視聴待機

    // 広告終了後の閉じるボタン
    const closeButton = await page
      .waitForSelector(
        'button:has-text("閉じる"), button:has-text("スキップ"), button[class*="close"]',
        { timeout: 10_000 }
      )
      .catch(() => null)

    if (closeButton) {
      await closeButton.click()
      await sleep(2000)
    }
  }

  // ゲーム画面でスタンプ獲得（訪問だけでもスタンプが貯まる場合がある）
  await sleep(5000)
}
