import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { triangleLotRed } from './red'
import { triangleLotYellow } from './yellow'
import { triangleLotPurple } from './purple'
import { triangleLotPink } from './pink'
import { triangleLotBlue } from './blue'
import { triangleLotGreen } from './green'

/**
 * 三角くじ
 * 全ての色の三角くじを実行する
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function triangleLot(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('triangleLot()')

  await context.runMethod(
    page,
    (p) => triangleLotRed(context, p),
    'triangleLotRed'
  )
  await context.runMethod(
    page,
    (p) => triangleLotYellow(context, p),
    'triangleLotYellow'
  )
  await context.runMethod(
    page,
    (p) => triangleLotPurple(context, p),
    'triangleLotPurple'
  )
  await context.runMethod(
    page,
    (p) => triangleLotPink(context, p),
    'triangleLotPink'
  )
  await context.runMethod(
    page,
    (p) => triangleLotBlue(context, p),
    'triangleLotBlue'
  )
  await context.runMethod(
    page,
    (p) => triangleLotGreen(context, p),
    'triangleLotGreen'
  )
}

// 個別のメソッドもエクスポート
export { triangleLotRed } from './red'
export { triangleLotYellow } from './yellow'
export { triangleLotPurple } from './purple'
export { triangleLotPink } from './pink'
export { triangleLotBlue } from './blue'
export { triangleLotGreen } from './green'
