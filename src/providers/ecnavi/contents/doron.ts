import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'

/**
 * どろん
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function doron(context: EcNaviContext, page: Page): Promise<void> {
  context.logger.info('doron()')

  await page.goto('https://ecnavi.jp/contents/doron/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`doron: 現在の URL: ${page.url()}`)

  // たぬきリンク
  const tanukiElement = await page
    .waitForSelector('ul.character-tanuki a', { timeout: 5000 })
    .catch(() => null)
  if (tanukiElement) {
    context.logger.info('doron: たぬきリンクをクリック')
    const newPage = await getNewTabPage(context.logger, page, tanukiElement)
    if (newPage != null) {
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    }
  } else {
    context.logger.warn('doron: たぬきリンクが見つかりません')
  }

  // きつねリンク
  const kitsuneElement = await page
    .waitForSelector('ul.character-kitsune a', { timeout: 5000 })
    .catch(() => null)
  if (kitsuneElement) {
    context.logger.info('doron: きつねリンクをクリック')
    const newPage = await getNewTabPage(context.logger, page, kitsuneElement)
    if (newPage != null) {
      await sleep(1000)
      await newPage.close()
      await sleep(1000)
    }
  } else {
    context.logger.warn('doron: きつねリンクが見つかりません')
  }

  context.logger.info('doron: 処理完了')
}
