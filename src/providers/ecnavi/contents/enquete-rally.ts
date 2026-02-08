import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

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

  await safeGoto(
    page,
    'https://ecnavi.jp/contents/enquete_rally/',
    context.logger
  )

  // 現在の URL をログ出力
  context.logger.info(`enqueteRally: 現在の URL: ${page.url()}`)

  // ラジオボタンが存在するか確認
  const radioInputs = await page.$$(
    'input[type="radio"][name="enquete_fields"]'
  )

  if (radioInputs.length === 0) {
    context.logger.info('アンケートが見つかりません（本日は終了済みの可能性）')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => ({
        url: globalThis.location.href,
        title: document.title,
        radioCount: document.querySelectorAll('input[type="radio"]').length,
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

  // ランダムに選択肢を選ぶ
  const randomIndex = Math.floor(Math.random() * radioInputs.length)
  const selectedRadio = radioInputs[randomIndex]

  // 選択されたラジオボタンのラベルテキストを取得
  const labelText = await page.evaluate((radio) => {
    const label = radio.closest('label')
    return label?.textContent?.trim() ?? '不明'
  }, selectedRadio)

  context.logger.info(`選択: ${labelText}`)

  // ラジオボタンをクリック
  await selectedRadio.click()
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
