import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ログインボーナス
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function loginBonus(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('loginBonus()')

  await page.goto('https://www.pointtown.com/', {
    waitUntil: 'networkidle2',
  })

  // ログインボーナスのポップアップが表示されるまで待つ
  const rewardButton = await page
    .waitForSelector('#js-get-reward-btn', {
      visible: true,
      timeout: 5000,
    })
    .catch(() => null)

  if (rewardButton === null) {
    context.logger.info('ログインボーナスのポップアップが表示されていません')
    return
  }

  // 「報酬を受け取る」ボタンをクリック
  await rewardButton.click()
  await sleep(3000)

  // 宝箱選択画面が表示された場合、閉じる（広告が必要なためスキップ）
  const closeButton = await page
    .waitForSelector('button.c-modal__close, a[href="/"]', {
      visible: true,
      timeout: 3000,
    })
    .catch(() => null)

  if (closeButton !== null) {
    await closeButton.click().catch(() => null)
  }

  context.logger.info('ログインボーナス完了')
}
