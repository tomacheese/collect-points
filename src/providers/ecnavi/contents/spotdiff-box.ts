import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * まちがい探し
 *
 * ecnavi.kantangame.com/spotdiff にリダイレクトされる。
 * 間違い探しゲームをプレイしてスタンプを獲得する。
 *
 * APIから回答座標を取得してクリックする。
 * API: https://ecnavi.kantangame.com/spotdiffapi/start.json
 * レスポンス: { status: "OK", data: { question: { answer_json_array: [...] } } }
 * answer_json_array の各要素: { x_from, y_from, x_to, y_to, answer_number }
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function spotdiffBox(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('spotdiffBox()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://ecnavi.jp/spotdiff_box/redirect/',
    context.logger
  )

  context.logger.info(`spotdiffBox: 現在のURL: ${page.url()}`)

  // 挑戦ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      const elements = [
        ...document.querySelectorAll('button, a'),
      ] as HTMLElement[]
      const button = elements.find((el) => el.textContent?.includes('挑戦'))
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (!clicked) {
    context.logger.warn('spotdiffBox: 挑戦ボタンが見つかりません')
    return
  }

  context.logger.info('spotdiffBox: 挑戦ボタンをクリック')
  await sleep(3000)

  // 広告があれば視聴
  await watchAdIfExists(page)

  // APIから回答データを取得
  let answerData: {
    x_from: number
    y_from: number
    x_to: number
    y_to: number
    answer_number: number
  }[] = []

  try {
    // ページのネットワークリクエストを監視してAPIレスポンスを取得
    const apiResponse = await page
      .evaluate(async () => {
        const response = await fetch(
          'https://ecnavi.kantangame.com/spotdiffapi/start.json'
        )
        return (await response.json()) as unknown
      })
      .catch(() => null)

    if (
      apiResponse &&
      typeof apiResponse === 'object' &&
      'status' in apiResponse &&
      apiResponse.status === 'OK' &&
      'data' in apiResponse &&
      apiResponse.data &&
      typeof apiResponse.data === 'object' &&
      'question' in apiResponse.data &&
      apiResponse.data.question &&
      typeof apiResponse.data.question === 'object' &&
      'answer_json_array' in apiResponse.data.question &&
      Array.isArray(apiResponse.data.question.answer_json_array)
    ) {
      answerData = apiResponse.data.question.answer_json_array as {
        x_from: number
        y_from: number
        x_to: number
        y_to: number
        answer_number: number
      }[]
      context.logger.info(
        `spotdiffBox: APIから ${answerData.length} 個の回答を取得`
      )
    } else {
      context.logger.warn('spotdiffBox: APIレスポンスが不正です')
      // 広告視聴だけでもスタンプが獲得できる場合があるため、待機
      await sleep(30_000)
      return
    }
  } catch (error) {
    context.logger.warn(
      `spotdiffBox: API取得エラー: ${error instanceof Error ? error.message : String(error)}`
    )
    await sleep(30_000)
    return
  }

  // 各回答座標をクリック
  for (const answer of answerData) {
    const x = Math.floor((answer.x_from + answer.x_to) / 2)
    const y = Math.floor((answer.y_from + answer.y_to) / 2)

    context.logger.info(
      `spotdiffBox: 回答 ${answer.answer_number} をクリック (${x}, ${y})`
    )

    // ゲーム画面の canvas 要素をクリック
    await page
      .evaluate(
        (clickX, clickY) => {
          const canvas = document.querySelector('canvas')
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const event = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + clickX,
              clientY: rect.top + clickY,
            })
            canvas.dispatchEvent(event)
          }
        },
        x,
        y
      )
      .catch(() => null)

    await sleep(1000)
  }

  context.logger.info('spotdiffBox: すべての回答をクリック完了')

  // 結果確認のための待機
  await sleep(5000)

  context.logger.info('spotdiffBox: 処理完了')
}
