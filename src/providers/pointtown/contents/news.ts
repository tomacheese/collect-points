import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * ニュース閲覧
 *
 * PointTown のニュース記事を閲覧して報酬を受け取る。
 * 最大 20 記事まで処理可能で、1 記事あたり 5 コイン、合計 100 コイン獲得できる。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function news(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('news()')

  await page.goto('https://www.pointtown.com/news/infoseek', {
    waitUntil: 'networkidle2',
  })

  // 初期未取得報酬を確認
  const initialUnclaimed = (await context.checkNewsCoin(page)) ?? 0
  context.logger.info(`未取得報酬: ${initialUnclaimed} コイン`)

  if (initialUnclaimed === 0) {
    context.logger.info('未取得報酬が 0 のため処理をスキップします')
    return
  }

  // 未読記事のリンクを取得（最大 20 記事）
  const links = await page.$$(
    'a.js-news-infoseek-article-link[data-is-completed="false"]'
  )
  const targetLinks = links.slice(0, 20)
  context.logger.info(
    `未読記事数: ${links.length}、処理対象: ${targetLinks.length}`
  )

  // 各記事を新しいタブで開く（記事を読んだ扱いにする）
  for (const link of targetLinks) {
    const url = await page.evaluate((element) => element.href, link)
    if (!url) {
      context.logger.error('記事 URL が取得できませんでした')
      continue
    }

    const newPage = await page.browser().newPage()
    try {
      await newPage.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      })
      await sleep(1000) // 記事読み込み待機
    } catch (error) {
      if ((error as Error).name === 'TimeoutError') {
        context.logger.warn(`記事ページ読み込みタイムアウト: ${url}`)
      } else {
        context.logger.error('記事ページ読み込みエラー', error as Error)
      }
    }
    await newPage.close()
  }

  // 報酬を受け取る（未取得報酬が 0 になるまで繰り返し）
  let processedCount = 0
  const maxAttempts = 20 // 最大 20 回試行

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 未取得報酬を確認
    const currentUnclaimed = (await context.checkNewsCoin(page)) ?? 0
    if (currentUnclaimed === 0) {
      context.logger.info('すべての報酬を受け取りました')
      break
    }

    // 報酬受け取りボタンを探す（style.display が "none" でないもの）
    const buttons = await page.$$('button.js-news-infoseek-article-submit')
    let targetButton = null

    for (const button of buttons) {
      const style = await page.evaluate((el) => el.style.display, button)
      if (style !== 'none') {
        targetButton = button
        break
      }
    }

    if (!targetButton) {
      context.logger.warn(
        `報酬受け取りボタンが見つかりません（未取得: ${currentUnclaimed} コイン）`
      )
      break
    }

    // ボタンをクリック
    try {
      await targetButton.evaluate((el) => {
        el.scrollIntoView({ block: 'center' })
      })
      await sleep(500)
      await Promise.all([
        targetButton.click(),
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 10_000,
        }),
      ])

      // クリック後に未取得報酬が減ったかを確認し、減っている場合のみ成功扱いとする
      const afterUnclaimed =
        (await context.checkNewsCoin(page)) ?? currentUnclaimed
      if (afterUnclaimed < currentUnclaimed) {
        processedCount++
        context.logger.info(`報酬受け取り ${processedCount} 回目完了`)
      } else {
        context.logger.warn(
          `報酬受け取りに失敗した可能性があります（未取得: ${afterUnclaimed} コインのまま）`
        )
        break
      }
      await sleep(1000)
    } catch (error) {
      context.logger.error('報酬受け取りエラー', error as Error)
      break
    }
  }

  // 最終未取得報酬を確認
  const finalUnclaimed = (await context.checkNewsCoin(page)) ?? 0
  const obtained = initialUnclaimed - finalUnclaimed
  context.logger.info(
    `獲得コイン: ${obtained} (${initialUnclaimed} → ${finalUnclaimed})`
  )

  if (finalUnclaimed > 0) {
    context.logger.warn(`未取得報酬が残っています: ${finalUnclaimed} コイン`)
  }
}
