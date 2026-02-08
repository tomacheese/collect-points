import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector } from '@/utils/functions'

/**
 * ちんじゅう先生のレッスン
 * @param context クローラーコンテキスト
 * @param page ページ
 * @param handleRewardedAd 広告ポップアップ処理関数
 */
export async function chinju(
  context: EcNaviContext,
  page: Page,
  handleRewardedAd: (page: Page) => Promise<void>
): Promise<void> {
  context.logger.info('chinju()')

  await page.goto('https://ecnavi.jp/research/chinju_lesson/', {
    waitUntil: 'networkidle2',
  })

  // ナビゲーション前に広告ポップアップをチェック
  await handleRewardedAd(page)

  if (await isExistsSelector(page, 'div.chinju-lesson-finished')) {
    context.logger.info('chinju() today finished')
    return
  }
  if (await isExistsSelector(page, 'div.chinju-lesson-interbal')) {
    context.logger.info('chinju() インターバル中')
    return
  }

  // 回答リンクをクリック（ランダムに「もちろん！」または「知らない・・・」を選択）
  const answerLinks = await page.$$('a[href*="/research/chinju_lesson/answer"]')
  if (answerLinks.length === 0) {
    context.logger.info('回答リンクが見つかりません')
    return
  }

  // ランダムに回答を選択
  const randomIndex = Math.floor(Math.random() * answerLinks.length)
  const selectedLink = answerLinks[randomIndex]

  try {
    // 広告オーバーレイによるクリック失敗を防ぐため JavaScript でクリック
    await Promise.all([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }),
      (async () => {
        await selectedLink.evaluate((el) => {
          ;(el as HTMLElement).click()
        })
      })(),
    ])
    context.logger.info('chinju() 回答完了')
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') {
      context.logger.warn(
        'ナビゲーションタイムアウト、広告ポップアップをチェック'
      )
      await handleRewardedAd(page)
    } else {
      throw error
    }
  }
}
