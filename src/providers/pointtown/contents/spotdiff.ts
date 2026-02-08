import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * まちがい探し
 *
 * gamebox.pointtown.com/spotdiff にリダイレクトされる。
 * 「挑戦する」→ 広告視聴 → ゲームプレイでルーペを獲得。
 * 100個ルーペを集めると抽選でコインが当たる。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function spotdiff(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('spotdiff()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/game/redirect/spotdiff',
    context.logger
  )

  // 「挑戦する」ボタンをクリック
  const challengeClicked = await page
    .evaluate(() => {
      const elements = [
        ...document.querySelectorAll('button, a'),
      ] as HTMLElement[]
      const button = elements.find((el) => el.textContent.includes('挑戦する'))
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (challengeClicked) {
    context.logger.info('spotdiff: 挑戦するボタンをクリック')
    await sleep(3000)
  } else {
    context.logger.warn('spotdiff: 挑戦するボタンが見つかりません')
  }

  // 広告を再生して開始するボタンがあればクリック
  const adClicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button')]
      const button = elements.find(
        (el) =>
          el.textContent.includes('広告を再生') ||
          el.textContent.includes('広告を見て')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (adClicked) {
    context.logger.info('spotdiff: 広告再生開始、30秒待機')
    await sleep(30_000) // 広告視聴待機

    // 広告終了後の閉じるボタン
    const closeClicked = await page
      .evaluate(() => {
        const elements = [...document.querySelectorAll('button')]
        const button = elements.find(
          (el) =>
            el.textContent.includes('閉じる') ||
            el.textContent.includes('スキップ') ||
            el.className.includes('close')
        )
        if (button) {
          button.click()
          return true
        }
        return false
      })
      .catch(() => false)

    if (closeClicked) {
      context.logger.info('spotdiff: 閉じるボタンをクリック')
      await sleep(2000)
    } else {
      context.logger.warn('spotdiff: 閉じるボタンが見つかりません')
    }
  }

  // ゲーム画面でスタンプ獲得（訪問だけでもスタンプが貯まる場合がある）
  await sleep(5000)
}
