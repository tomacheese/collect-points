import type { Logger } from '@book000/node-utils'
import type { Page } from 'rebrowser-puppeteer-core'

/**
 * クローラーの基本コンテキスト
 * すべてのコンテンツメソッドに渡される共通のコンテキスト
 */
export interface CrawlerContext {
  /** ロガー */
  logger: Logger
  /**
   * メソッドを実行する（エラーハンドリング付き）
   * @param page ページ
   * @param method 実行するメソッド
   * @param methodName メソッド名（スクリーンショットのファイル名に使用）
   */
  runMethod: (
    page: Page,
    method: (page: Page) => Promise<void>,
    methodName?: string
  ) => Promise<void>
}

/**
 * EcNavi クローラーのコンテキスト
 */
export interface EcNaviContext extends CrawlerContext {
  /**
   * 現在のポイントを取得する
   * @param page ページ
   * @returns ポイント数
   */
  getCurrentPoint: (page: Page) => Promise<number>
}

/**
 * PointTown クローラーのコンテキスト
 */
export interface PointTownContext extends CrawlerContext {
  /**
   * 現在のポイントを取得する
   * @param page ページ
   * @returns ポイント数
   */
  getCurrentPoint: (page: Page) => Promise<number>
  /**
   * 三角くじをチェックする
   * @param page ページ
   */
  checkTriangleLot: (page: Page) => Promise<void>
  /**
   * ニュースコインの数をチェックする
   * @param page ページ
   * @returns コイン数（取得できない場合は null）
   */
  checkNewsCoin: (page: Page) => Promise<number | null>
  /**
   * 広告があれば視聴する
   * @param page ページ
   */
  watchAdIfExists: (page: Page) => Promise<void>
}
