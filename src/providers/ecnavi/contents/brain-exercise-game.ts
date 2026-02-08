import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 頭の体操ゲーム
 *
 * ecnavi.ib-game.jp/stamp にリダイレクトされる。
 * 複数のミニゲーム（三字熟語、英単語、計算など）をプレイしてスタンプを獲得する。
 * スタンプを10個集めて10pts獲得。1日5回プレイ可能、1日5スタンプまで獲得可能。
 *
 * ゲームリスト（一部）:
 * - /sanji/ (三字熟語ゲーム)
 * - /eitango/ (英単語ゲーム)
 * - /keisan/ (計算ゲーム)
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param watchAdIfExists 広告視聴処理関数
 */
export async function brainExerciseGame(
  context: EcNaviContext,
  page: Page,
  watchAdIfExists: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('brainExerciseGame()')

  // スタンプページに移動
  await safeGoto(
    page,
    'https://ecnavi.jp/brain_exercise_game/redirect/',
    context.logger
  )

  await sleep(3000)

  // 広告があれば視聴
  await watchAdIfExists(page)

  const currentUrl = page.url()
  context.logger.info(`brainExerciseGame: 現在のURL: ${currentUrl}`)

  // スタンプページのURLからURLオブジェクトを取得
  // 例: https://ecnavi.ib-game.jp/stamp/?uid=...&media_id=174&syid=...
  const urlObj = new URL(currentUrl)

  // ゲームリスト（優先順位順）
  const games = [
    { name: '三字熟語ゲーム', path: '/sanji/top.php' },
    { name: '英単語ゲーム', path: '/eitango/top.php' },
    { name: '計算ゲーム', path: '/keisan/top.php' },
  ]

  // 最大3ゲームを試行
  for (const game of games.slice(0, 3)) {
    const gameUrl = `${urlObj.origin}${game.path}${urlObj.search}`
    context.logger.info(`brainExerciseGame: ${game.name}にアクセス`)

    try {
      await safeGoto(page, gameUrl, context.logger)
      await sleep(2000)

      // 「スタートする」ボタンをクリック
      const started = await page
        .evaluate(() => {
          const buttons = [...document.querySelectorAll('button, a')]
          const startButton = buttons.find((btn) =>
            btn.textContent?.includes('スタートする')
          )
          if (startButton) {
            startButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return true
          }
          return false
        })
        .catch(() => false)

      if (!started) {
        context.logger.warn(
          `brainExerciseGame: ${game.name}の「スタートする」ボタンが見つかりません`
        )
        continue
      }

      await sleep(1000)

      // 実際にクリック
      await page
        .evaluate(() => {
          const buttons = [...document.querySelectorAll('button, a')]
          const startButton = buttons.find((btn) =>
            btn.textContent?.includes('スタートする')
          )
          if (startButton) {
            ;(startButton as HTMLElement).click()
          }
        })
        .catch(() => null)

      context.logger.info(`brainExerciseGame: ${game.name}を開始`)

      // ゲーム実行を待機（ゲームは自動的に進行しないため、適度な待機）
      await sleep(10_000)

      context.logger.info(`brainExerciseGame: ${game.name}完了`)
    } catch (error) {
      context.logger.warn(
        `brainExerciseGame: ${game.name}でエラー: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  context.logger.info('brainExerciseGame: 処理完了')
}
