import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * まちがい探し
 *
 * ecnavi.kantangame.com/spotdiff にリダイレクトされる。
 * 間違い探しゲームをプレイしてスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
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

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://ecnavi.jp/spotdiff_box/redirect/',
    context.logger
  )

  // 挑戦ボタンをクリック
  const challengeButton = await page
    .waitForSelector('button:has-text("挑戦"), a:has-text("挑戦")', {
      timeout: 5000,
    })
    .catch(() => null)

  if (challengeButton) {
    await challengeButton.click()
    await sleep(3000)
  }

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム画面で待機
  await sleep(10_000)
}
