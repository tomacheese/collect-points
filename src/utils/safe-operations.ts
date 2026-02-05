import type { Logger } from '@book000/node-utils'
import type { ElementHandle, Page } from 'rebrowser-puppeteer-core'
import { sleep } from './functions'

/**
 * safeGoto のオプション
 */
interface SafeGotoOptions {
  /**
   * ネットワークアイドルを待機するかどうか
   *
   * true の場合は networkidle2 を使用（通常のページ向け）
   * false の場合は domcontentloaded を使用（ゲームページなど動的コンテンツが多い場合）
   * デフォルト: false
   */
  preferNetworkIdle?: boolean
  /** タイムアウト（ミリ秒）。デフォルト: 30000 */
  timeout?: number
  /** タイムアウト時にリトライするかどうか。デフォルト: false */
  retryOnTimeout?: boolean
}

/**
 * safeWaitForNavigation のオプション
 */
interface SafeWaitForNavigationOptions {
  /** タイムアウト（ミリ秒）。デフォルト: 30000 */
  timeout?: number
}

/**
 * smartClick のオプション
 */
interface SmartClickOptions {
  /** 要素を表示領域にスクロールするかどうか。デフォルト: true */
  scrollIntoView?: boolean
  /** JavaScript で直接クリックするかどうか。デフォルト: false（失敗時にフォールバック） */
  useJavaScript?: boolean
  /** クリック前の待機時間（ミリ秒）。デフォルト: 500 */
  waitBeforeClick?: number
}

/**
 * ゲームページなど動的コンテンツが多いページへの安全なナビゲーション
 *
 * 広告のリアルタイム読み込みや WebSocket 接続などにより networkidle2 では
 * タイムアウトしやすいページに対して、domcontentloaded で待機する。
 * タイムアウトが発生しても、ページは既に表示されている可能性が高いため処理を継続する。
 *
 * @param page ページ
 * @param url ナビゲーション先の URL
 * @param logger ロガー
 * @param options オプション
 */
export async function safeGoto(
  page: Page,
  url: string,
  logger: Logger,
  options?: SafeGotoOptions
): Promise<void> {
  const waitUntil = options?.preferNetworkIdle
    ? 'networkidle2'
    : 'domcontentloaded'
  const timeout = options?.timeout ?? 30_000

  try {
    await page.goto(url, { waitUntil, timeout })
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') {
      if (options?.retryOnTimeout) {
        // load イベントで再試行
        logger.warn(
          `ナビゲーションタイムアウト (${waitUntil})、load で再試行します: ${url}`
        )
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 15_000 })
          return
        } catch (retryError) {
          if ((retryError as Error).name === 'TimeoutError') {
            logger.warn(
              `再試行もタイムアウトしましたが処理を継続します: ${url}`
            )
            return
          }
          throw retryError
        }
      }
      // タイムアウト時はページが表示されている可能性が高いため継続
      logger.warn(
        `ナビゲーションタイムアウトが発生しましたが処理を継続します: ${url}`
      )
      return
    }
    throw error
  }
}

/**
 * アクション実行後のナビゲーション待機（タイムアウト時も継続）
 *
 * クリックなどのアクション実行後にページ遷移を待機する。
 * タイムアウトしてもページは遷移している可能性が高いため処理を継続する。
 *
 * @param page ページ
 * @param action 実行するアクション（クリックなど）
 * @param logger ロガー
 * @param options オプション
 */
export async function safeWaitForNavigation(
  page: Page,
  action: () => Promise<void>,
  logger: Logger,
  options?: SafeWaitForNavigationOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30_000

  try {
    await Promise.all([
      action(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout }),
    ])
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') {
      // タイムアウトしても継続（ページは遷移している可能性が高い）
      logger.warn('ナビゲーション待機がタイムアウトしましたが処理を継続します')
      await sleep(2000) // 安定化のため待機
      return
    }
    throw error
  }
}

/**
 * 堅牢なクリック処理（自動スクロール + JavaScript フォールバック）
 *
 * Puppeteer の element.click() が物理的なマウスクリックをシミュレートしようとして
 * 「Node is either not clickable or not an Element」エラーが発生する場合に対応する。
 * 要素が他の要素に覆われている、viewport 外にある、または広告ポップアップが
 * 干渉している場合でも、JavaScript フォールバックで確実にクリックを実行する。
 *
 * @param element クリック対象の要素
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
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
          'Puppeteer click が失敗したため JavaScript フォールバックを使用します'
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
