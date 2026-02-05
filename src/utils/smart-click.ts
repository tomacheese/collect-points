import type { Logger } from '@book000/node-utils'
import type { ElementHandle } from 'rebrowser-puppeteer-core'
import { sleep } from '@/utils/functions'

/**
 * smartClick のオプション
 */
interface SmartClickOptions {
  /** クリック前に要素を表示領域にスクロールするか（デフォルト: true） */
  scrollIntoView?: boolean
  /** 強制的に JavaScript クリックを使用するか（デフォルト: false） */
  useJavaScript?: boolean
  /** スクロール後のクリック前待機時間（ミリ秒、デフォルト: 500） */
  waitBeforeClick?: number
}

/**
 * 堅牢なクリック処理（自動スクロール + JavaScript フォールバック）
 *
 * 要素を表示領域の中央にスクロールした後、Puppeteer の click() を試みる。
 * 「Node is either not clickable or not an Element」エラーが発生した場合は、
 * JavaScript で直接クリックを実行するフォールバック処理を行う。
 *
 * 広告ポップアップや他の要素に覆われている場合でも、JavaScript クリックにより
 * 確実にクリック処理を実行できる（Issue #415）。
 *
 * @param element クリック対象の要素ハンドル
 * @param logger ロガー
 * @param options オプション
 */
export async function smartClick(
  element: ElementHandle,
  logger: Logger,
  options?: SmartClickOptions
): Promise<void> {
  const shouldScroll = options?.scrollIntoView ?? true
  const useJS = options?.useJavaScript ?? false
  const waitTime = options?.waitBeforeClick ?? 500

  if (shouldScroll) {
    // 要素を表示領域の中央に移動
    await element.evaluate((el) => {
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    await sleep(waitTime)
  }

  if (useJS) {
    // JavaScript で直接クリック（広告などの干渉を回避）
    await element.evaluate((el) => {
      ;(el as HTMLElement).click()
    })
  } else {
    // 通常のクリックを試み、失敗時は JavaScript にフォールバック
    try {
      await element.click()
    } catch (error) {
      if (error instanceof Error && error.message.includes('not clickable')) {
        logger.warn(
          'Puppeteer click failed with "not clickable", falling back to JavaScript click'
        )
        await element.evaluate((el) => {
          ;(el as HTMLElement).click()
        })
      } else {
        throw error
      }
    }
  }
}
