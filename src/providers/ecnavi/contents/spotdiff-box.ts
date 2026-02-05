import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { smartClick } from '@/utils'

/**
 * まちがい探し
 *
 * ecnavi.kantangame.com/spotdiff にリダイレクトされる。
 * 間違い探しゲームをプレイしてスタンプを獲得する。
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function spotdiffBox(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('spotdiffBox()')

  await page.goto('https://ecnavi.jp/spotdiff_box/redirect/', {
    waitUntil: 'networkidle2',
  })

  // 挑戦ボタンをクリック
  const challengeButton = await page
    .waitForSelector('button:has-text("挑戦"), a:has-text("挑戦")', {
      timeout: 5000,
    })
    .catch(() => null)

  if (challengeButton) {
    await smartClick(challengeButton, context.logger)
    await sleep(3000)
  }

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム画面で待機
  await sleep(10_000)
}
