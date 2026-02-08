import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * チョイス（投票）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function choice(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('choice()')

  await page.goto('https://ecnavi.jp/vote/choice/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`choice: 現在の URL: ${page.url()}`)

  if (!(await isExistsSelector(page, 'ul.answer_botton button'))) {
    context.logger.info('choice: 回答ボタンが見つかりません（本日は終了済み）')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        buttonCount: document.querySelectorAll('button').length,
        bodyText: document.body.textContent.slice(0, 200),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(`choice: デバッグ情報: ${JSON.stringify(debugInfo)}`)
    }
    return
  }

  context.logger.info('choice: 回答ボタンをクリック')
  await page
    .waitForSelector('ul.answer_botton button')
    .then((element) => element?.click())
  await sleep(3000)

  context.logger.info('choice: 処理完了')
}
