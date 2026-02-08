import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ポイント畑
 *
 * クレーンゲーム形式で野菜を収穫してポイントを獲得する。
 * ①右 →②下 の順でアームを操作する。
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function vegetable(
  context: EcNaviContext,
  page: Page
): Promise<void> {
  context.logger.info('vegetable()')

  await page.goto('https://ecnavi.jp/game/vegetable/', {
    waitUntil: 'networkidle2',
  })

  // はじめるボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      // img[alt*="はじめる"] を探す
      const img = document.querySelector('img[alt*="はじめる"]')
      if (img && img.parentElement) {
        img.parentElement.click()
        return true
      }

      // a タグでテキストに「はじめる」を含む要素を探す
      const elements = Array.from(
        document.querySelectorAll('a')
      ) as HTMLElement[]
      const button = elements.find((el) => el.textContent?.includes('はじめる'))
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    await sleep(2000)

    // クレーンゲーム操作：右方向に移動（長押し）
    // ゲーム画面内をクリック・ホールドして操作
    const gameArea = await page.$('.game_box, #game, [class*="game"]')
    if (gameArea) {
      // 右移動（クリックして少し待つ）
      await page.mouse.down()
      await sleep(2000) // 適度な位置まで移動
      await page.mouse.up()
      await sleep(1000)

      // 下移動（再度クリックして少し待つ）
      await page.mouse.down()
      await sleep(1500)
      await page.mouse.up()
    }

    await sleep(5000)
  }

  await sleep(3000)
}
