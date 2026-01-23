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
  spotdiffBox,
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
   * runMethod をオーバーライドして、各メソッド実行後に Google Rewarded Ads をチェックする
   */
  public override async runMethod(
    page: Page,
    method: (page: Page) => Promise<void>
  ): Promise<void> {
    await super.runMethod(page, method)

    // 各メソッド実行後に Google Rewarded Ads をチェック（エラーは無視）
    try {
      await this.handleRewardedAd(page)
    } catch (error) {
      this.logger.warn('handleRewardedAd failed', error as Error)
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
    await this.runMethod(page, (p) => entryLottery(this.context, p))

    await this.runMethod(page, (p) => gesoten(this.context, p))
    await this.runMethod(page, (p) => chirashi(this.context, p))
    await this.runMethod(page, (p) =>
      chinju(this.context, p, this.handleRewardedAd.bind(this))
    )
    await this.runMethod(page, (p) => quiz(this.context, p))
    await this.runMethod(page, (p) => divination(this.context, p))
    await this.runMethod(page, (p) => fishing(this.context, p))
    await this.runMethod(page, (p) => choice(this.context, p))
    await this.runMethod(page, (p) => news(this.context, p))
    await this.runMethod(page, (p) => garapon(this.context, p))
    await this.runMethod(page, (p) => doron(this.context, p))
    await this.runMethod(page, (p) => ticketingLottery(this.context, p))
    await this.runMethod(page, (p) => fund(this.context, p))

    // 新ゲーム
    await this.runMethod(page, (p) =>
      natsupoi(this.context, p, this.watchAdIfExists.bind(this))
    )
    await this.runMethod(page, (p) =>
      spotdiffBox(this.context, p, this.watchAdIfExists.bind(this))
    )
    await this.runMethod(page, (p) => languageTravel(this.context, p))
    await this.runMethod(page, (p) =>
      brainExerciseGame(this.context, p, this.watchAdIfExists.bind(this))
    )
    await this.runMethod(page, (p) =>
      easyGame(this.context, p, this.watchAdIfExists.bind(this))
    )
    await this.runMethod(page, (p) =>
      brainTraining(this.context, p, this.watchAdIfExists.bind(this))
    )
    await this.runMethod(page, (p) => vegetable(this.context, p))
    await this.runMethod(page, (p) => chocoRead(this.context, p))
    await this.runMethod(page, (p) => enqueteRally(this.context, p))

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.1)
  }

  /**
   * 現在のポイントを取得する
   * @param page ページ
   * @returns ポイント数
   */
  async getCurrentPoint(page: Page): Promise<number> {
    this.logger.info('getCurrentPoint()')
    await page.goto('https://ecnavi.jp/mypage/', {
      waitUntil: 'networkidle2',
    })

    const nPointText = await page.evaluate((): string | null => {
      const element = document.querySelector('span.c_point')
      return element?.textContent ?? null
    })
    if (nPointText == null) {
      return -1
    }
    const replaced = nPointText.replaceAll(',', '')
    return Number.parseInt(replaced, 10)
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
   * ECNavi では Google Rewarded Ads のポップアップが表示されることがある。
   * Issue #216 の要件:
   * 1. ページアクセス後、広告が表示されるかどうか待つ
   * 2. 表示された場合、再生を開始
   * 3. 終了ボタンが表示されるまで待機
   * 4. 終了ボタンを押下
   *
   * @param page ページ
   */
  protected async handleRewardedAd(page: Page): Promise<void> {
    // 「短い広告を見る」ボタンを 5 秒間待機（広告表示の検出用）
    const rewardedAdButton = await page
      .waitForSelector('button.fc-rewarded-ad-button', { timeout: 5000 })
      .catch(() => null)

    if (!rewardedAdButton) {
      return
    }

    this.logger.info('Google Rewarded Ads のポップアップを検出')

    // 「短い広告を見る」ボタンをクリック
    await rewardedAdButton.click()
    this.logger.info('広告再生開始')

    // 広告視聴を待機（最大 60 秒）
    // 広告終了後、ポップアップが閉じるか、閉じるボタンが表示されるまで待つ
    const startTime = Date.now()
    const maxWaitTime = 60_000 // 60 秒
    let loopCount = 0

    while (Date.now() - startTime < maxWaitTime) {
      loopCount++

      // ポップアップが閉じたかチェック
      const popupExists = await isExistsSelector(
        page,
        '.fc-monetization-dialog-container'
      )
      if (!popupExists) {
        this.logger.info('広告ポップアップが閉じました')
        break
      }

      // 閉じるボタンを探す
      const closeButton = await page
        .$(
          'button.fc-close, button[aria-label="close"], button[aria-label="閉じる"]'
        )
        .catch(() => null)
      if (closeButton) {
        try {
          await closeButton.click()
          this.logger.info('閉じるボタンをクリック')
          await sleep(2000)
          break
        } catch {
          // 閉じるボタンが既に消えている場合は継続
          this.logger.warn('閉じるボタンのクリックに失敗')
        }
      }

      // 10 回ごとに進捗ログを出力
      if (loopCount % 10 === 0) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
        this.logger.info(`広告視聴待機中... ${elapsedSeconds}秒経過`)
      }

      await sleep(1000)
    }

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

    await sleep(2000)
  }
}
