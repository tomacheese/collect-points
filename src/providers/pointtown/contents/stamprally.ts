import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * スタンプラリー
 *
 * スタンプラリーは /game ページにあり、他の活動（easyGame, gesoten, pointQ 等）を
 * 完了することでスタンプが貯まります。このメソッドは進捗状況のログ出力を行います。
 *
 * 注意: スタンプは他のメソッド（easyGame, gesoten, pointQ など）の実行時に
 * 自動的に獲得されるため、このメソッドは主に進捗確認用です。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function stamprally(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('stamprally()')

  await page.goto('https://www.pointtown.com/game#link-stamp-sec', {
    waitUntil: 'networkidle2',
  })

  // スタンプラリーの進捗を確認
  const stampSection = await page.$('#link-stamp-sec')
  if (stampSection === null) {
    context.logger.info('スタンプラリーセクションが見つかりません')
    return
  }

  // デイリーミッションの進捗を取得
  const progressSections = await page.$$('.c-game-progress-sec')
  for (const section of progressSections) {
    const reward = await section
      .$eval('.c-game-progress-sec__reward', (el) =>
        el.textContent ? el.textContent.trim().replaceAll(/\s+/g, ' ') : ''
      )
      .catch(() => '')
    const note = await section
      .$eval('.c-game-progress-sec__note', (el) =>
        el.textContent ? el.textContent.trim() : ''
      )
      .catch(() => '')
    if (reward || note) {
      context.logger.info(`スタンプラリー: ${reward} (${note})`)
    }
  }
}
