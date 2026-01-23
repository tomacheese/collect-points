import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'

/**
 * かんたんゲーム
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function easyGame(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('easyGame()')
  await page.goto('https://www.pointtown.com/game/redirect/easygame', {
    waitUntil: 'networkidle2',
  })

  // 抽選に参加できるボタンをクリック（サイトリニューアル後のセレクタ）
  await page
    .waitForSelector('a.c-n-side-profile__pop', {
      visible: true,
      timeout: 5000,
    })
    .then((element) => element?.click())
    .catch(() => null)
}
