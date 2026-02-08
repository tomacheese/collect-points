import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * ちょこ読み
 *
 * 雑誌を読んでポイントを獲得する。
 * 無料チケットで読み、ページをめくって最後までいくとポイントが獲得できる。
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function chocoRead(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('chocoRead()')

  await page.goto('https://ecnavi.jp/contents/chocoyomi/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`chocoRead: 現在の URL: ${page.url()}`)

  // 「今すぐ読んでポイントゲット」ボタンをクリック
  const directLinkButton = await page
    .waitForSelector('a.chocoyomi-direct-link__button', { timeout: 5000 })
    .catch(() => null)

  if (!directLinkButton) {
    context.logger.info('ちょこ読みのボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        linkCount: document.querySelectorAll('a').length,
        linkTexts: [...document.querySelectorAll('a')]
          .map((a) => a.textContent.trim())
          .slice(0, 10),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `chocoRead: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
    return
  }

  context.logger.info(
    'chocoRead: 「今すぐ読んでポイントゲット」ボタンをクリック'
  )

  await Promise.all([
    directLinkButton.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ])

  // 無料チケットで読む
  context.logger.info(`chocoRead: レンタルページの URL: ${page.url()}`)
  const rentalButton = await page
    .waitForSelector('button.chocoyomi-ad-page__button.button-rental', {
      timeout: 5000,
    })
    .catch(() => null)

  if (!rentalButton) {
    context.logger.info('無料チケットボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        buttonCount: document.querySelectorAll('button').length,
        buttonTexts: [...document.querySelectorAll('button')]
          .map((b) => b.textContent.trim())
          .slice(0, 10),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `chocoRead: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
    return
  }

  context.logger.info('chocoRead: 無料チケットボタンをクリック')
  await rentalButton.click()
  await sleep(1000)

  // チケットの使用確認: はい
  const confirmButton = await page
    .waitForSelector('button.p_dialog__button.c_red', { timeout: 5000 })
    .catch(() => null)

  if (confirmButton) {
    await confirmButton.click()
    await sleep(2000)
  }

  // 左側をクリックしてページをめくる（なくなるまで）
  let pageCount = 0
  const maxPages = 50 // 無限ループ防止
  while (
    pageCount < maxPages &&
    (await isExistsSelector(
      page,
      'button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]'
    ))
  ) {
    const leftButton = await page
      .waitForSelector('button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]', {
        timeout: 3000,
      })
      .catch(() => null)

    if (!leftButton) break

    await leftButton.click()
    await sleep(1000)
    pageCount++
  }

  context.logger.info(`ページをめくりました: ${pageCount} ページ`)

  // ポイント獲得ボタンをクリック
  const pointButton = await page
    .waitForSelector('button.chocoyomi-ad-page__button.button-point', {
      timeout: 5000,
    })
    .catch(() => null)

  if (pointButton) {
    // ボタンを表示領域に移動（広告などの干渉を回避）
    await pointButton.evaluate((el) => {
      el.scrollIntoView({ block: 'center' })
    })
    await sleep(500)

    // JavaScript で直接クリック（Puppeteer の click() は要素の配置により失敗することがある）
    await pointButton.evaluate((el) => {
      ;(el as HTMLElement).click()
    })
    await sleep(1000)
  }
}
