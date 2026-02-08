import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto, safeWaitForNavigation } from '@/utils/safe-operations'

/**
 * 脳トレクイズ
 *
 * ecnavi.kantangame.com/quiz にリダイレクトされる。
 * クイズに回答してスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function brainTraining(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('brainTraining()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://ecnavi.jp/brain_training/redirect/',
    context.logger
  )

  // 開始ボタンをクリック（JavaScript でテキストを含む要素を探す）
  const startClicked = await page
    .evaluate(() => {
      const elements = [
        ...document.querySelectorAll('button, a'),
      ] as HTMLElement[]
      const button = elements.find(
        (el) =>
          el.textContent.includes('つづきから') ||
          el.textContent.includes('はじめる') ||
          el.textContent.includes('挑戦')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (startClicked) {
    context.logger.info('brainTraining: 開始ボタンをクリックしました')
    // ページ遷移を待機（クリック済みだが遷移検出のため waitForNavigation を使用）
    await page
      .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 })
      .catch(() => {
        context.logger.warn(
          'brainTraining: 開始ボタンクリック後のナビゲーション待機がタイムアウト'
        )
      })
  } else {
    context.logger.warn('brainTraining: 開始ボタンが見つかりません')
  }

  // 現在のURLをログに出力
  context.logger.info(`brainTraining: 現在のURL: ${page.url()}`)

  // 広告があれば視聴
  await watchAdIfExists(page)

  // クイズに回答
  for (let i = 0; i < 10; i++) {
    const answerButtons = await page.$$(
      'button[class*="answer"], li[class*="choice"] button'
    )
    if (answerButtons.length === 0) {
      context.logger.info(
        `brainTraining: 回答ボタンが見つかりません（問題 ${i + 1}）。クイズ終了または未開始。`
      )
      // ページの状態をデバッグ
      const debugInfo = await page
        .evaluate(() => {
          const allButtons = [...document.querySelectorAll('button')]
          return {
            url: globalThis.location.href,
            title: document.title,
            buttonCount: allButtons.length,
            buttonTexts: allButtons
              .map((b) => b.textContent.trim())
              .slice(0, 10),
          }
        })
        .catch(() => null)
      if (debugInfo) {
        context.logger.info(
          `brainTraining: デバッグ情報: ${JSON.stringify(debugInfo)}`
        )
      }
      break
    }

    context.logger.info(
      `brainTraining: 問題 ${i + 1}/10（選択肢数: ${answerButtons.length}）`
    )

    const randomIndex = Math.floor(Math.random() * answerButtons.length)

    // 回答をクリックし、ページのリロードを待機
    await safeWaitForNavigation(
      page,
      () => answerButtons[randomIndex].click(),
      context.logger,
      { timeout: 5000 }
    )

    await sleep(1000)

    // 次へボタン（JavaScript でテキストを含む要素を探す）
    const nextClicked = await page
      .evaluate(() => {
        const elements = [
          ...document.querySelectorAll('button, a'),
        ] as HTMLElement[]
        const button = elements.find((el) => el.textContent.includes('次へ'))
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch(() => false)

    if (nextClicked) {
      context.logger.info(`brainTraining: 「次へ」ボタンをクリック`)
      // 次のページへの遷移を待機（クリック済みだが遷移検出のため waitForNavigation を使用）
      await page
        .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 })
        .catch(() => {
          context.logger.warn(
            'brainTraining: 「次へ」ボタンクリック後のナビゲーション待機がタイムアウト'
          )
        })
    }
  }

  await sleep(3000)
}
