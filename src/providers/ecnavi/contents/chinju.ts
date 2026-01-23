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

  // 問題リンクをクリックしてナビゲーション（タイムアウト時は広告をチェックしてリトライ）
  for (let attempt = 0; attempt < 2; attempt++) {
    const questionLink = await page
      .waitForSelector('a.chinju-lesson-question__link', { timeout: 5000 })
      .catch(() => null)

    if (!questionLink) {
      context.logger.info('問題リンクが見つかりません')
      return
    }

    try {
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }),
        questionLink.click(),
      ])
      // ナビゲーション成功
      return
    } catch (error) {
      if ((error as Error).name === 'TimeoutError') {
        context.logger.warn(
          `ナビゲーションタイムアウト (試行 ${attempt + 1}/2)、広告ポップアップをチェック`
        )
        // タイムアウト時は広告をチェック
        await handleRewardedAd(page)
        // ページをリロードしてリトライ
        await page.goto('https://ecnavi.jp/research/chinju_lesson/', {
          waitUntil: 'networkidle2',
        })
        // 次のループで再試行
      } else {
        throw error
      }
    }
  }
}
