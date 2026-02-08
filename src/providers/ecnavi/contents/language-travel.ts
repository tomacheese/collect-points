import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * 語学トラベル
 *
 * 英語学習クイズでポイントを獲得する。
 * 正解・不正解に関わらず、3問回答すると1ポイント獲得（最大3ポイント＝9問）。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function languageTravel(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('languageTravel()')

  // 最初の問題ページに移動
  await page.goto(
    'https://ecnavi.jp/contents/language_travel/courses/1/question/?daily_question_number=1',
    {
      waitUntil: 'networkidle2',
    }
  )

  // 9問回答（最大3ポイント）
  for (let i = 1; i <= 9; i++) {
    context.logger.info(`languageTravel: 問題 ${i}/9`)

    await sleep(2000)

    // 選択肢ボタンを取得
    const answerButtons = await page.$$('button[type="button"]')

    // ナビゲーションボタンを除外（テキストが短い選択肢のみ）
    const validButtons = []
    for (const button of answerButtons) {
      const text = await page.evaluate(
        (el) => el.textContent?.trim() || '',
        button
      )
      if (
        text.length > 0 &&
        text.length < 50 &&
        !text.includes('毎日貯まる') &&
        !text.includes('その他') &&
        !text.includes('マイメニュー')
      ) {
        validButtons.push(button)
      }
    }

    if (validButtons.length === 0) {
      context.logger.warn(`languageTravel: 問題 ${i} の選択肢が見つかりません`)
      break
    }

    // ランダムに選択してクリック
    const randomIndex = Math.floor(Math.random() * validButtons.length)

    // ページのリロードを待機するために Promise.all を使用
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10_000 }),
      validButtons[randomIndex].click(),
    ])

    context.logger.info(
      `languageTravel: 選択肢 ${randomIndex + 1}/${validButtons.length} をクリック`
    )

    // ページがリロードされたことを確認（&is_answered=1 が追加される）
    const currentUrl = page.url()
    if (!currentUrl.includes('is_answered=1')) {
      context.logger.warn(
        `languageTravel: 問題 ${i} の回答が記録されていない可能性があります`
      )
    }

    await sleep(2000)

    // 最後の問題でない場合は「次の問題へ」ボタンをクリック
    if (i < 9) {
      // 「次の問題へ」ボタンを探す（最大10秒待機）
      let nextButton = null
      const maxAttempts = 20 // 0.5秒 × 20 = 10秒
      let attempts = 0

      while (!nextButton && attempts < maxAttempts) {
        await sleep(500)
        const buttons = await page.$$('button')

        for (const button of buttons) {
          const text = await page.evaluate(
            (el) => el.textContent?.trim() || '',
            button
          )
          if (text.includes('次の問題へ')) {
            nextButton = button
            break
          }
        }

        attempts++
      }

      if (nextButton) {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 10_000,
          }),
          nextButton.click(),
        ])
        context.logger.info('languageTravel: 次の問題へ移動')
      } else {
        context.logger.warn(
          `languageTravel: 問題 ${i} の「次の問題へ」ボタンが見つかりません（${attempts}回試行）`
        )
        break
      }
    }
  }

  context.logger.info('languageTravel: 完了')
}
