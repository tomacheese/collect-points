import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { getNewTabPage, sleep } from '@/utils/functions'

/**
 * ポイントチャンス (アンケートページ下部)
 *
 * 注意: 2024年以降、この機能はサイトから削除された可能性があります。
 * 要素が見つからない場合は早期リターンします。
 *
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function pointChance(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('pointChance()')
  await page.goto('https://www.pointtown.com/enquete#link-coin-chance', {
    waitUntil: 'networkidle2',
  })
  const notObtainedElement = await page.$(
    'div.c-coin-chance-sec__status p.c-coin-label'
  )
  if (notObtainedElement == null) {
    context.logger.info(
      'コインチャンスセクションが見つかりません（この機能は廃止された可能性があります）'
    )
    return
  }
  const notObtained = await notObtainedElement.evaluate(
    (element): string | null => element.textContent
  )
  if (notObtained == null) {
    context.logger.info('notObtained not found.')
    return
  }
  if (Number(notObtained) === 0) {
    context.logger.info('notObtained is 0.')
    return
  }

  const cards = await page.$$('li.c-coin-chance-card')
  for (const card of cards) {
    const button = await card.$('button')
    const anchor = await card.$('a')
    if (button == null || anchor == null) {
      continue
    }
    const anchorClass = await page.evaluate(
      (element) => element.className,
      anchor
    )
    if (!anchorClass.includes('c-coin-chance-card__active-btn')) {
      continue
    }

    const newPage = await getNewTabPage(context.logger, page, button)
    if (newPage == null) {
      context.logger.error('newPage not found.')
    } else {
      await sleep(5000)
      await newPage.close()
    }
  }
}
