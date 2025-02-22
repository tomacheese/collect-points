import { Logger } from '@book000/node-utils'
import { Browser, ElementHandle, Page } from 'puppeteer-core'
import { getConfig } from './configuration'
import { sendDiscordMessage } from './discord'

export async function sleep(msec: number) {
  return new Promise((resolve) => setTimeout(resolve, msec))
}

export function calcEarnedPoint(previousPoint: number, currentPoint: number) {
  return +(currentPoint - previousPoint).toFixed(2)
}

export function calcEarnedYen(earnedPoint: number, rate: number) {
  return +(earnedPoint * rate).toFixed(2)
}

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

export async function getNewTabPageFromSelector(
  logger: Logger,
  page: Page,
  elementSelector: string
): Promise<Page | null> {
  await page.waitForSelector(elementSelector)
  return getNewTabPage(logger, page, await page.$(elementSelector))
}

type EqualType = 'equal' | 'includes' | 'startsWith'

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

export function scrollToBottom(page: Page) {
  return page.evaluate(() => {
    window.scroll({
      top: document.body.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  })
}

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
