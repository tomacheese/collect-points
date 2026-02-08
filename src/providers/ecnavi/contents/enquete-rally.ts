import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * アンケートラリー
 * 毎日アンケートに回答してポイントを獲得
 * ドロップダウンからランダムに選択して回答
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function enqueteRally(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('enqueteRally()')

  await page.goto('https://ecnavi.jp/contents/enquete_rally/', {
    waitUntil: 'networkidle2',
  })

  // 現在の URL をログ出力
  context.logger.info(`enqueteRally: 現在の URL: ${page.url()}`)

  // ドロップダウンが存在するか確認
  const selectElement = await page
    .waitForSelector('select.c_select', { timeout: 5000 })
    .catch(() => null)

  if (!selectElement) {
    context.logger.info('アンケートが見つかりません（本日は終了済みの可能性）')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        selectCount: document.querySelectorAll('select').length,
        bodyText: document.body.textContent?.slice(0, 200),
      }))
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `enqueteRally: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
    return
  }

  // ドロップダウンの選択肢を取得（最初の「選択してください」を除く）
  const options = await page.$$eval(
    'select.c_select option[value]:not([value=""])',
    (elements) => elements.map((el) => el.getAttribute('value') ?? '')
  )

  if (options.length === 0) {
    context.logger.info('選択肢が見つかりません')
    return
  }

  // ランダムに選択肢を選ぶ
  const randomIndex = Math.floor(Math.random() * options.length)
  const selectedValue = options[randomIndex]
  context.logger.info(`選択: ${selectedValue}`)

  await page.select('select.c_select', selectedValue)
  await sleep(1000)

  // 回答するボタンをクリック
  const submitButton = await page
    .waitForSelector('button.question-area__button.c_red', { timeout: 5000 })
    .catch(() => null)

  if (submitButton) {
    await submitButton.click()
    context.logger.info('回答を送信しました')
    await sleep(2000)
  } else {
    context.logger.info('回答ボタンが見つかりません')
  }
}
