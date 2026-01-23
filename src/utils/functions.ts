import { Logger } from '@book000/node-utils'
import { Browser, ElementHandle, Page } from 'rebrowser-puppeteer-core'
import { getConfig } from '@/core/configuration'
import { sendDiscordMessage } from '@/core/discord'

/**
 * 指定ミリ秒待機する
 * @param msec 待機ミリ秒
 */
export async function sleep(msec: number) {
  return new Promise((resolve) => setTimeout(resolve, msec))
}

/**
 * Cloudflare のチャレンジページかどうかを判定する
 * @param page ページ
 * @returns Cloudflare チャレンジページの場合は true
 */
export async function isCloudflareChallenge(page: Page): Promise<boolean> {
  const indicators = await page.evaluate(() => {
    const title = document.title.toLowerCase()

    // Cloudflare チャレンジページの特徴（タイトルのみで判定、より厳密に）
    const isChallengeTitle =
      title === 'just a moment...' || title.includes('attention required')

    // Turnstile iframe の存在確認
    const hasTurnstile =
      document.querySelector('iframe[src*="challenges.cloudflare.com"]') !==
      null

    // cf-spinner の存在確認（Cloudflare 固有の要素）
    const hasSpinner =
      document.querySelector('#cf-spinner-please-wait') !== null

    // Cloudflare のチャレンジコンテナ
    const hasChallengeContainer =
      document.querySelector('#challenge-running') !== null ||
      document.querySelector('#challenge-stage') !== null

    return {
      title,
      isChallengeTitle,
      hasTurnstile,
      hasSpinner,
      hasChallengeContainer,
    }
  })

  // Cloudflare 固有の要素が存在する場合のみ true
  return (
    indicators.isChallengeTitle ||
    indicators.hasTurnstile ||
    indicators.hasSpinner ||
    indicators.hasChallengeContainer
  )
}

/**
 * Cloudflare のチャレンジが完了するまで待機する
 * @param page ページ
 * @param logger ロガー
 * @param timeout タイムアウト（ミリ秒）
 * @returns チャレンジが完了した場合は true、タイムアウトした場合は false
 */
export async function waitForCloudflareChallenge(
  page: Page,
  logger: Logger,
  timeout = 60_000
): Promise<boolean> {
  // 最初のチェックで Cloudflare チャレンジでなければすぐに返す
  const initialCheck = await isCloudflareChallenge(page)
  if (!initialCheck) {
    return true
  }

  logger.info(`Cloudflare チャレンジを検出（URL: ${page.url()}）、待機開始...`)

  const startTime = Date.now()
  let checkCount = 0

  while (Date.now() - startTime < timeout) {
    checkCount++
    await sleep(3000)

    const isChallenge = await isCloudflareChallenge(page)
    if (!isChallenge) {
      logger.info(
        `Cloudflare チャレンジ完了（${checkCount} 回チェック、${Math.round((Date.now() - startTime) / 1000)} 秒）`
      )
      return true
    }

    logger.info(
      `Cloudflare チャレンジ待機中... (${checkCount} 回目、残り ${Math.round((timeout - (Date.now() - startTime)) / 1000)} 秒)`
    )
  }

  logger.warn(`Cloudflare チャレンジのタイムアウト（${timeout / 1000} 秒経過）`)
  return false
}

/**
 * 獲得ポイントを計算する
 * @param previousPoint 前回のポイント
 * @param currentPoint 現在のポイント
 * @returns 獲得ポイント
 */
export function calcEarnedPoint(previousPoint: number, currentPoint: number) {
  return +(currentPoint - previousPoint).toFixed(2)
}

/**
 * 獲得ポイントを円換算する
 * @param earnedPoint 獲得ポイント
 * @param rate レート
 * @returns 円換算額
 */
export function calcEarnedYen(earnedPoint: number, rate: number) {
  return +(earnedPoint * rate).toFixed(2)
}

/**
 * セレクタが存在するかどうかを確認する
 * @param page ページ
 * @param selector セレクタ
 * @returns 存在する場合は true
 */
export async function isExistsSelector(
  page: Page,
  selector: string
): Promise<boolean> {
  return new Promise((resolve) => {
    page
      .waitForSelector(selector, { timeout: 3000 })
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        resolve(false)
      })
  })
}

/**
 * 開いているページ数を取得する
 * @param browser ブラウザ
 * @returns ページ数
 */
export function getPageCount(browser: Browser) {
  return new Promise<number>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout'))
    }, 30_000)
    browser
      .pages()
      .then((pages) => {
        resolve(pages.length)
      })
      .catch((error: unknown) => {
        reject(error as Error)
      })
  })
}

/**
 * 新しいタブページを取得する
 * @param logger ロガー
 * @param page ページ
 * @param element クリックする要素
 * @returns 新しいタブページ（取得できない場合は null）
 */
export async function getNewTabPage(
  logger: Logger,
  page: Page,
  element: ElementHandle | null
): Promise<Page | null> {
  logger.info(`getNewTabPage()`)
  const browser = page.browser()
  const beforeOpenPages = await getPageCount(browser)
  logger.info(`beforeOpenPages: ${beforeOpenPages}`)

  await sleep(1000)
  logger.info(`click element`)
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  element?.click()

  let successful = false
  for (let index = 0; index < 30; index++) {
    // wait 30 seconds
    logger.info(`[${index}] getting pages`)
    const afterOpenPages = await getPageCount(browser)
    logger.info(`[${index}] afterOpenPages: ${afterOpenPages}`)
    if (beforeOpenPages < afterOpenPages) {
      successful = true
      logger.info(`[${index}] successful, break`)
      break
    }
    logger.info(`[${index}] wait 1 sec`)
    await sleep(1000)
    logger.info(`[${index}] next...`)
  }
  if (!successful) {
    logger.info(`not successful`)
    return null
  }
  logger.info(`afterOpenPages: successful`)
  const pages = await browser.pages()
  return pages.at(-1) ?? null
}

/**
 * セレクタから新しいタブページを取得する
 * @param logger ロガー
 * @param page ページ
 * @param elementSelector 要素のセレクタ
 * @returns 新しいタブページ（取得できない場合は null）
 */
export async function getNewTabPageFromSelector(
  logger: Logger,
  page: Page,
  elementSelector: string
): Promise<Page | null> {
  await page.waitForSelector(elementSelector)
  return getNewTabPage(logger, page, await page.$(elementSelector))
}

type EqualType = 'equal' | 'includes' | 'startsWith'

/**
 * 指定 URL になるまで待機する
 * @param page ページ
 * @param type 比較タイプ
 * @param url URL
 * @param timeout タイムアウト（ミリ秒）
 */
export async function waitForUrl(
  page: Page,
  type: EqualType,
  url: string,
  timeout = 60_000
) {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      const currentUrl = page.url()
      if (type === 'equal' && currentUrl === url) {
        clearInterval(interval)
        resolve()
      } else if (type === 'includes' && currentUrl.includes(url)) {
        clearInterval(interval)
        resolve()
      } else if (type === 'startsWith' && currentUrl.startsWith(url)) {
        clearInterval(interval)
        resolve()
      }
    }, 1000)
    setTimeout(() => {
      clearInterval(interval)
      reject(new Error(`Timeout: ${url}`))
    }, timeout)
  })
}

/**
 * ページの最下部までスクロールする
 * @param page ページ
 */
export function scrollToBottom(page: Page) {
  return page.evaluate(() => {
    window.scroll({
      top: document.body.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  })
}

/**
 * 完了通知を送信する
 * @param targetScript 対象スクリプト名
 * @param beforePt 開始前ポイント
 * @param afterPt 終了後ポイント
 * @param rate レート
 */
export async function finishedNotify(
  targetScript: string,
  beforePt: number,
  afterPt: number,
  rate: number | undefined
) {
  const config = getConfig()
  const earnedPt = calcEarnedPoint(beforePt, afterPt)
  const earnedYen = rate === undefined ? null : calcEarnedYen(earnedPt, rate)
  // saveCurrentPoint(targetScript, afterPt, earnedPt, earnedYen);

  if (beforePt === afterPt) {
    return
  }

  await sendDiscordMessage(
    config,
    `:ballot_box_with_check: Finished script: \`${targetScript}\` (\`${beforePt}\`pt -> \`${afterPt}\`pt | Earned: \`${earnedPt}\`pt, \`${earnedYen}\`yen)`
  )
}
