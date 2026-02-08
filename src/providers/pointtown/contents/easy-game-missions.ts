import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * ログインミッションを実行
 * @param context クローラーコンテキスト
 * @param page ページ
 */
async function executeLoginMission(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('ログインミッション実行中...')

  try {
    // 「ログイン」タブが選択されていることを確認（デフォルトで表示されるはず）
    await sleep(2000)

    // 「受け取る」ボタンをクリック
    const receiveClicked = await page
      .evaluate(() => {
        const buttons = [...document.querySelectorAll('button')]
        const button = buttons.find((btn) =>
          btn.textContent?.includes('受け取る')
        )
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch((error: unknown) => {
        throw new Error(
          `Failed to execute receive button click: ${error instanceof Error ? error.message : String(error)}`
        )
      })

    if (!receiveClicked) {
      context.logger.warn('ログインミッションの受け取るボタンが見つかりません')
      return
    }

    await sleep(2000)

    // ポップアップで「受け取る」ボタンをクリック（広告なしのボタンを探す）
    const popupClicked = await page
      .evaluate(() => {
        const buttons = [...document.querySelectorAll('button')]
        // 「受け取る」を含み、「広告」を含まないボタンを探す
        const button = buttons.find(
          (btn) =>
            btn.textContent?.includes('受け取る') &&
            !btn.textContent?.includes('広告')
        )
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch((error: unknown) => {
        throw new Error(
          `Failed to execute popup button click: ${error instanceof Error ? error.message : String(error)}`
        )
      })

    if (popupClicked) {
      context.logger.info('ログインミッション報酬を受け取りました')
      await sleep(2000)
    } else {
      context.logger.warn(
        'ログインミッションのポップアップボタンが見つかりません'
      )
    }
  } catch (error) {
    context.logger.error('ログインミッション実行エラー:', error as Error)
  }
}

/**
 * ルーレットキャンペーンを実行（1日10回）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
async function executeRouletteCampaign(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('ルーレットキャンペーン実行中...')

  try {
    // 「ルーレット」タブをクリック
    const rouletteTab = await page
      .waitForSelector('a[href="#roulette"]', {
        visible: true,
        timeout: 5000,
      })
      .catch(() => null)

    if (!rouletteTab) {
      context.logger.warn('ルーレットタブが見つかりません')
      return
    }

    await rouletteTab.click()
    await sleep(2000)

    // 1 日 10 回ルーレットを回す
    for (let i = 0; i < 10; i++) {
      context.logger.info(`ルーレット ${i + 1}/10 回目`)

      // 「ルーレットを回す」ボタンをクリック
      const spinClicked = await page
        .evaluate(() => {
          const buttons = [...document.querySelectorAll('button')]
          const button = buttons.find((btn) =>
            btn.textContent?.includes('ルーレットを回す')
          )
          if (button) {
            button.click()
            return true
          }
          return false
        })
        .catch((error: unknown) => {
          throw new Error(
            `Failed to execute spin button click: ${error instanceof Error ? error.message : String(error)}`
          )
        })

      if (!spinClicked) {
        context.logger.info('本日のルーレット回数上限に達しました')
        break
      }

      await sleep(2000)

      // watchAdIfExists() を使用して広告視聴を試みる
      // このメソッドは BaseCrawler に実装されているが、関数コンテキストからは呼び出せないため
      // インラインで実装（既存の easyGame と同じパターン）
      const adClicked = await page
        .evaluate(() => {
          const buttons = [...document.querySelectorAll('button')]
          const button = buttons.find((btn) =>
            btn.textContent?.includes('広告を見てルーレットを回す')
          )
          if (button) {
            button.click()
            return true
          }
          return false
        })
        .catch((error: unknown) => {
          throw new Error(
            `Failed to execute ad button click: ${error instanceof Error ? error.message : String(error)}`
          )
        })

      if (!adClicked) {
        context.logger.warn('広告視聴ボタンが見つかりません、スキップします')
        break
      }

      await sleep(3000)

      // Google Rewarded Ads が表示される場合、URL から #goog_rewarded を除去して再アクセス
      const currentUrl = page.url()
      if (currentUrl.includes('#goog_rewarded')) {
        context.logger.info('広告ポップアップを検出、スキップします')
        const cleanUrl = currentUrl.replace('#goog_rewarded', '')
        await safeGoto(page, cleanUrl, context.logger)
        await sleep(2000)
      } else {
        // 広告視聴完了後、ルーレット結果を待つ
        await sleep(5000)
      }

      context.logger.info(`ルーレット ${i + 1} 回目完了`)

      // 次のルーレットのために「ルーレット」タブに戻る
      await safeGoto(
        page,
        'https://gamebox.pointtown.com/easygame/event#roulette',
        context.logger
      )
      await sleep(2000)
    }

    context.logger.info('ルーレットキャンペーン完了')
  } catch (error) {
    context.logger.error('ルーレットキャンペーン実行エラー:', error as Error)
  }
}

/**
 * かんたんゲームボックスのミッション
 * ログインミッションとルーレットキャンペーンを実行する
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function easyGameMissions(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('easyGameMissions()')

  // ミッションページにアクセス（動的コンテンツが多いため safeGoto を使用）
  await safeGoto(
    page,
    'https://gamebox.pointtown.com/easygame/event',
    context.logger
  )

  // ログインミッションを実行
  await executeLoginMission(context, page)

  // ルーレットキャンペーンを実行（1日10回）
  await executeRouletteCampaign(context, page)
}
