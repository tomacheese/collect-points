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
 * Google Rewarded Ads のモーダルは runMethod() で自動処理される。
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

  // ボタンが読み込まれるまで待機
  try {
    await page.waitForSelector('button', { timeout: 30_000 })
  } catch {
    context.logger.warn('natsupoi: ボタン要素の読み込みがタイムアウトしました')
  }

  // ゲーム開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button')]
      const button = elements.find(
        (el) =>
          el.textContent.includes('スタート') ||
          el.textContent.includes('はじめる') ||
          el.textContent.includes('プレイ')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch((error: unknown) => {
      // evaluate のエラーをログ出力（Error オブジェクトの場合は第2引数に渡す）
      const err = error instanceof Error ? error : new Error(String(error))
      context.logger.warn('natsupoi: ボタンクリック処理でエラー', err)
      return false
    })

  if (clicked) {
    context.logger.info('natsupoi: ゲーム開始ボタンをクリック')
    // ページ遷移を待機（クリック済みだが遷移検出のため waitForNavigation を使用）
    await page
      .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 })
      .catch(() => {
        context.logger.warn(
          'natsupoi: ゲーム開始ボタンクリック後のナビゲーション待機がタイムアウト'
        )
      })
    context.logger.info('natsupoi: ゲーム待機完了')
  } else {
    context.logger.warn('natsupoi: ゲーム開始ボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allButtons = [...document.querySelectorAll('button')]
        return {
          url: globalThis.location.href,
          title: document.title,
          buttonCount: allButtons.length,
          buttonTexts: allButtons.map((b) => b.textContent.trim()).slice(0, 10),
        }
      })
      .catch((error: unknown) => {
        // デバッグ情報取得のエラーもログ出力（Error オブジェクトの場合は第2引数に渡す）
        const err = error instanceof Error ? error : new Error(String(error))
        context.logger.warn('natsupoi: デバッグ情報取得でエラー', err)
        return null
      })
    if (debugInfo) {
      context.logger.info(
        `natsupoi: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }

  await sleep(5000)
}
