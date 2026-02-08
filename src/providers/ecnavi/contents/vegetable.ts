import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

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

  await safeGoto(page, 'https://ecnavi.jp/game/vegetable/', context.logger)

  // 現在のURLをログに出力
  context.logger.info(`vegetable: 現在のURL: ${page.url()}`)

  // はじめるボタンをクリック（JavaScript でテキストを含む要素を探す）
  const clicked = await page
    .evaluate(() => {
      // img[alt*="はじめる"] を探す
      const img = document.querySelector('img[alt*="はじめる"]')
      if (img?.parentElement) {
        img.parentElement.click()
        return true
      }

      // a タグでテキストに「はじめる」を含む要素を探す
      const elements = [...document.querySelectorAll('a')]
      const button = elements.find((el) => el.textContent.includes('はじめる'))
      if (button) {
        button.click()
        return true
      }
      return false
    })
    .catch(() => false)

  if (clicked) {
    context.logger.info('vegetable: はじめるボタンをクリック')
    await sleep(2000)

    // クレーンゲーム操作：右方向に移動（長押し）
    // ゲーム画面内をクリック・ホールドして操作
    const gameArea = await page.$('.game_box, #game, [class*="game"]')
    if (gameArea) {
      context.logger.info('vegetable: ゲームエリアを検出、クレーン操作開始')
      // 右移動（クリックして少し待つ）
      await page.mouse.down()
      await sleep(2000) // 適度な位置まで移動
      await page.mouse.up()
      await sleep(1000)

      // 下移動（再度クリックして少し待つ）
      await page.mouse.down()
      await sleep(1500)
      await page.mouse.up()
      context.logger.info('vegetable: クレーン操作完了')
    } else {
      context.logger.warn('vegetable: ゲームエリアが見つかりません')
    }

    await sleep(5000)
  } else {
    context.logger.warn('vegetable: はじめるボタンが見つかりません')
    // デバッグ情報を出力
    const debugInfo = await page
      .evaluate(() => {
        const allImages = [...document.querySelectorAll('img')]
        const allLinks = [...document.querySelectorAll('a')]
        return {
          url: globalThis.location.href,
          title: document.title,
          imageCount: allImages.length,
          imageAlts: allImages.map((img) => img.alt).slice(0, 10),
          linkCount: allLinks.length,
          linkTexts: allLinks.map((a) => a.textContent.trim()).slice(0, 10),
        }
      })
      .catch(() => null)
    if (debugInfo) {
      context.logger.info(
        `vegetable: デバッグ情報: ${JSON.stringify(debugInfo)}`
      )
    }
  }

  await sleep(3000)
}
