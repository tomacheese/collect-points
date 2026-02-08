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

  // 現在のURLをログに出力
  context.logger.info(`spotdiffBox: 現在のURL: ${page.url()}`)

  // 挑戦ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('button, a')
      ) as HTMLElement[]
      const button = elements.find((el) => el.textContent?.includes('挑戦'))
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('spotdiffBox: 挑戦ボタンをクリック')
    await sleep(3000)
  } else {
    context.logger.warn('spotdiffBox: 挑戦ボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allButtons = Array.from(
          document.querySelectorAll('button, a')
        ) as HTMLElement[]
        return {
          url: window.location.href,
          title: document.title,
          buttonCount: allButtons.length,
          buttonTexts: allButtons.map((b) => b.textContent?.trim()).slice(0, 10),
        }
      })
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `spotdiffBox: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム画面で待機
  context.logger.info('spotdiffBox: ゲーム待機開始')
  await sleep(10_000)
  context.logger.info('spotdiffBox: ゲーム待機完了')
}
