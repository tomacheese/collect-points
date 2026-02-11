import { BaseCrawler } from '@/core/base-crawler'
import { getConfig } from '@/core/configuration'
import type { EcNaviContext } from '@/core/types'
import {
  finishedNotify,
  isExistsSelector,
  sleep,
  waitForUrl,
} from '@/utils/functions'
import type { Browser, Page } from 'rebrowser-puppeteer-core'

// コンテンツ関数のインポート
import {
  chinju,
  chirashi,
  choice,
  divination,
  doron,
  fishing,
  fund,
  garapon,
  gesoten,
  news,
  quiz,
  entryLottery,
  ticketingLottery,
  natsupoi,
  languageTravel,
  brainExerciseGame,
  easyGame,
  brainTraining,
  vegetable,
  chocoRead,
  enqueteRally,
} from './contents'

/**
 * ECナビクローラー
 */
export default class EcNaviCrawler extends BaseCrawler {
  /**
   * コンテンツ関数に渡すコンテキストを取得する
   */
  private get context(): EcNaviContext {
    return {
      logger: this.logger,
      runMethod: this.runMethod.bind(this),
      getCurrentPoint: this.getCurrentPoint.bind(this),
    }
  }

  /**
   * ログインする
   * @param page ページ
   */
  protected async login(page: Page): Promise<void> {
    this.logger.info('login()')
    const config = getConfig()
    await page.goto('https://ecnavi.jp/login/', {
      waitUntil: 'networkidle2',
    })
    await page
      .waitForSelector('input[name="email"]')
      .then((element) => element?.type(config.ecnavi.email))
    await page
      .waitForSelector('input[name="passwd"]')
      .then((element) => element?.type(config.ecnavi.password))

    // ログインボタンをクリック
    const loginButton = await page.waitForSelector(
      'button[type="submit"], input[type="submit"]'
    )
    if (loginButton) {
      await loginButton.click()
    }

    await waitForUrl(page, 'equal', 'https://ecnavi.jp/')
  }

  /**
   * ログイン済みかどうかを確認する
   * @param page ページ
   * @returns ログイン済みの場合は true
   */
  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info('checkAlreadyLogin()')
    await page.goto('https://ecnavi.jp/mypage/', {
      waitUntil: 'networkidle2',
    })
    return isExistsSelector(page, 'p.user-current__name')
  }

  /**
   * クローリングを実行する
   * @param _ ブラウザ（未使用）
   * @param page ページ
   */
  protected async crawl(_: Browser, page: Page): Promise<void> {
    this.logger.info('crawl()')

    const beforePoint = await this.getCurrentPoint(page)
    this.logger.info(`beforePoint: ${beforePoint}`)

    // 一番最初にエントリー
    if (this.shouldRun('entryLottery')) {
      await this.runMethod(
        page,
        (p) => entryLottery(this.context, p),
        'entryLottery'
      )
    }

    if (this.shouldRun('gesoten')) {
      await this.runMethod(page, (p) => gesoten(this.context, p), 'gesoten')
    }
    if (this.shouldRun('chirashi')) {
      await this.runMethod(page, (p) => chirashi(this.context, p), 'chirashi')
    }
    if (this.shouldRun('chinju')) {
      await this.runMethod(
        page,
        (p) => chinju(this.context, p, this.handleRewardedAd.bind(this)),
        'chinju'
      )
    }
    if (this.shouldRun('quiz')) {
      await this.runMethod(page, (p) => quiz(this.context, p), 'quiz')
    }
    if (this.shouldRun('divination')) {
      await this.runMethod(
        page,
        (p) => divination(this.context, p),
        'divination'
      )
    }
    if (this.shouldRun('fishing')) {
      await this.runMethod(page, (p) => fishing(this.context, p), 'fishing')
    }
    if (this.shouldRun('choice')) {
      await this.runMethod(page, (p) => choice(this.context, p), 'choice')
    }
    if (this.shouldRun('news')) {
      await this.runMethod(page, (p) => news(this.context, p), 'news')
    }
    if (this.shouldRun('garapon')) {
      await this.runMethod(page, (p) => garapon(this.context, p), 'garapon')
    }
    if (this.shouldRun('doron')) {
      await this.runMethod(page, (p) => doron(this.context, p), 'doron')
    }
    if (this.shouldRun('ticketingLottery')) {
      await this.runMethod(
        page,
        (p) => ticketingLottery(this.context, p),
        'ticketingLottery'
      )
    }
    if (this.shouldRun('fund')) {
      await this.runMethod(page, (p) => fund(this.context, p), 'fund')
    }

    // 新ゲーム
    if (this.shouldRun('natsupoi')) {
      await this.runMethod(
        page,
        (p) => natsupoi(this.context, p, this.watchAdIfExists.bind(this)),
        'natsupoi'
      )
    }
    if (this.shouldRun('languageTravel')) {
      await this.runMethod(
        page,
        (p) => languageTravel(this.context, p),
        'languageTravel'
      )
    }
    if (this.shouldRun('brainExerciseGame')) {
      await this.runMethod(
        page,
        (p) =>
          brainExerciseGame(this.context, p, this.watchAdIfExists.bind(this)),
        'brainExerciseGame'
      )
    }
    if (this.shouldRun('easyGame')) {
      await this.runMethod(
        page,
        (p) => easyGame(this.context, p, this.watchAdIfExists.bind(this)),
        'easyGame'
      )
    }
    if (this.shouldRun('brainTraining')) {
      await this.runMethod(
        page,
        (p) => brainTraining(this.context, p, this.watchAdIfExists.bind(this)),
        'brainTraining'
      )
    }
    if (this.shouldRun('vegetable')) {
      await this.runMethod(page, (p) => vegetable(this.context, p), 'vegetable')
    }
    if (this.shouldRun('chocoRead')) {
      await this.runMethod(page, (p) => chocoRead(this.context, p), 'chocoRead')
    }
    if (this.shouldRun('enqueteRally')) {
      await this.runMethod(
        page,
        (p) => enqueteRally(this.context, p),
        'enqueteRally'
      )
    }

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.1)
  }

  /**
   * 現在のポイントを取得する
   * @param page ページ
   * @returns ポイント数（取得できない場合は -1）
   */
  protected async getCurrentPoint(page: Page): Promise<number> {
    this.logger.info('getCurrentPoint()')

    const startTime = Date.now()
    // リトライロジック（最大 3 回試行）
    for (let retry = 0; retry < 3; retry++) {
      try {
        await page.goto('https://ecnavi.jp/mypage/', {
          waitUntil: 'domcontentloaded',
          timeout: 180_000, // 3 分に延長
        })

        const nPointText = await page.evaluate((): string | null => {
          const element = document.querySelector('span.c_point')
          return element?.textContent ?? null
        })
        if (nPointText == null) {
          // 要素未取得も失敗として扱い、リトライさせる
          throw new ReferenceError('Point element not found')
        }
        const replaced = nPointText.replaceAll(',', '')
        const parsed = Number.parseInt(replaced, 10)
        if (Number.isNaN(parsed)) {
          // 数値に変換できない場合もリトライ対象とする
          throw new TypeError(`Point value is NaN (replaced: ${replaced})`)
        }
        return parsed
      } catch (error) {
        if (retry < 2) {
          this.logger.warn(
            `getCurrentPoint: リトライ ${retry + 1}/3 (${(error as Error).message})`
          )
          await sleep(10_000) // 10 秒待機してリトライ
          continue
        }
        // 最後のリトライでも失敗した場合は診断情報を保存
        const executionTime = Date.now() - startTime
        await this.saveDiagnosticsIfEnabled(
          page,
          'getCurrentPoint',
          error as Error,
          executionTime
        )
        this.logger.error(
          'getCurrentPoint: 3 回リトライしましたが失敗しました',
          error as Error
        )
        return -1
      }
    }
    // TypeScript の型チェックのため（理論上到達しない）
    return -1
  }

  /**
   * 広告があれば視聴する共通処理（ゲーム内広告向け）
   * @param page ページ
   */
  private async watchAdIfExists(page: Page): Promise<void> {
    const adButton = await page
      .waitForSelector(
        'button:has-text("広告を再生"), button:has-text("広告を見て"), button:has-text("動画を見る")',
        { timeout: 3000 }
      )
      .catch(() => null)

    if (adButton) {
      await adButton.click()
      this.logger.info('広告再生開始、30秒待機')
      await sleep(30_000)

      const closeButton = await page
        .waitForSelector(
          'button:has-text("閉じる"), button:has-text("スキップ"), button[class*="close"], [class*="close-button"]',
          { timeout: 10_000 }
        )
        .catch(() => null)

      if (closeButton) {
        await closeButton.click()
        await sleep(2000)
      }
    }
  }

  /**
   * Google Rewarded Ads（短い広告を見る）に対応する
   *
   * BaseCrawler の共通処理に加えて、ECNavi 固有の URL ハッシュ除去を行う。
   * ECNavi では広告表示後に URL に `#goog_rewarded` が残ることがあり、
   * これを除去しないと次の操作に影響する（Issue #216）。
   *
   * @param page ページ
   */
  protected override async handleRewardedAd(page: Page): Promise<void> {
    await super.handleRewardedAd(page)

    // URL に #goog_rewarded が残っている場合は history.replaceState で除去（リロード不要）
    const finalUrl = page.url()
    if (finalUrl.includes('#goog_rewarded')) {
      const url = new URL(finalUrl)
      url.hash = ''
      const cleanUrl = url.toString()
      this.logger.info(`URL から #goog_rewarded を除去: ${cleanUrl}`)
      await page.evaluate((newUrl: string) => {
        globalThis.history.replaceState(null, '', newUrl)
      }, cleanUrl)
    }
  }
}
