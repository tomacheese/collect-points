import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * クラッシュアイス（パズル）
 *
 * gamebox.pointtown.com/puzzle にリダイレクトされる。
 * パズルゲームをプレイしてスタンプを獲得する。
 *
 * リダイレクト先のゲームページでは動的コンテンツが多いため safeGoto を使用する。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function puzzle(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('puzzle()')

  // ゲームページは動的コンテンツが多いため safeGoto を使用
  await safeGoto(
    page,
    'https://www.pointtown.com/game/redirect/puzzle',
    context.logger
  )

  // 開始ボタンをクリック
  const clicked = await page
    .evaluate(() => {
      const elements = [...document.querySelectorAll('button')]
      const button = elements.find(
        (el) =>
          el.textContent.includes('挑戦') ||
          el.textContent.includes('はじめる') ||
          el.textContent.includes('スタート')
      )
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('puzzle: 開始ボタンをクリック')
    await sleep(3000)
  } else {
    context.logger.warn('puzzle: 開始ボタンが見つかりません')
  }

  // 広告があれば視聴
  await context.watchAdIfExists(page)

  // ゲーム画面で待機（参加するだけでスタンプが貯まる）
  await sleep(10_000)
}
