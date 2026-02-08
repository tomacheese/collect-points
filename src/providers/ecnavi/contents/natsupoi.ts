import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ナツポイ
 *
 * ecnavi.natsupoi.com にリダイレクトされる。
 * ゲームをプレイしてポイントを獲得する。
 *
 * リダイレクト先のゲームページでは、広告のリアルタイム読み込みや WebSocket 接続などが
 * 継続的に行われるため networkidle2 ではタイムアウトしやすい。
 * safeGoto を使用してタイムアウト時も処理を継続する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function natsupoi(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('natsupoi()')

  // ゲームページは広告読み込み等でネットワークアイドルにならないため safeGoto を使用
  await safeGoto(page, 'https://ecnavi.jp/natsupoi/redirect/', context.logger)

  // 現在のURLをログに出力
  context.logger.info(`natsupoi: 現在のURL: ${page.url()}`)

  // 広告があれば視聴
  await watchAdIfExists(page)

  // ゲーム開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button'))
      const button = elements.find(
        (el) =>
          el.textContent?.includes('スタート') ||
          el.textContent?.includes('はじめる') ||
          el.textContent?.includes('プレイ')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('natsupoi: ゲーム開始ボタンをクリック')
    await sleep(10_000)
    context.logger.info('natsupoi: ゲーム待機完了')
  } else {
    context.logger.warn('natsupoi: ゲーム開始ボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'))
        return {
          url: globalThis.location.href,
          title: document.title,
          buttonCount: allButtons.length,
          buttonTexts: allButtons
            .map((b) => b.textContent?.trim())
            .slice(0, 10),
        }
      })
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `natsupoi: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }

  await sleep(5000)
}
