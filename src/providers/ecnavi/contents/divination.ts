import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 占い
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function divination(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('divination()')

  // 星座占い
  await page.goto('https://ecnavi.jp/contents/divination/western_astrology/', {
    waitUntil: 'networkidle2',
  })
  context.logger.info(`divination: 星座占いの URL: ${page.url()}`)

  const westernButton = await page
    .waitForSelector('ul.western-astrology-list button', { timeout: 5000 })
    .catch(() => null)
  if (westernButton) {
    await westernButton.click()
    context.logger.info('divination: 星座占いボタンをクリック')
  } else {
    context.logger.warn('divination: 星座占いボタンが見つかりません')
  }
  await sleep(3000)

  // タロット占い
  await page.goto('https://ecnavi.jp/contents/divination/tarot/', {
    waitUntil: 'networkidle2',
  })
  context.logger.info(`divination: タロット占いの URL: ${page.url()}`)

  const tarotButton = await page
    .waitForSelector('ul.draw-tarot button', { timeout: 5000 })
    .catch(() => null)
  if (tarotButton) {
    await tarotButton.click()
    context.logger.info('divination: タロット占いボタンをクリック')
  } else {
    context.logger.warn('divination: タロット占いボタンが見つかりません')
  }
  await sleep(3000)

  // おみくじ
  await page.goto('https://ecnavi.jp/contents/divination/omikuji/', {
    waitUntil: 'networkidle2',
  })
  context.logger.info(`divination: おみくじの URL: ${page.url()}`)

  const omikujiButton = await page
    .waitForSelector('button.draw-omikuji__button', { timeout: 5000 })
    .catch(() => null)
  if (omikujiButton) {
    await omikujiButton.click()
    context.logger.info('divination: おみくじボタンをクリック')
  } else {
    context.logger.warn('divination: おみくじボタンが見つかりません')
  }
  await sleep(10_000)

  context.logger.info('divination: 処理完了')
}
