import { BaseCrawler } from '@/core/base-crawler'
import { getConfig } from '@/core/configuration'
import type { PointTownContext } from '@/core/types'
import {
  finishedNotify,
  getNewTabPageFromSelector,
  isExistsSelector,
  scrollToBottom,
  sleep,
  waitForUrl,
} from '@/utils/functions'
import type { Browser, Page } from 'rebrowser-puppeteer-core'
import {
  brainTraining,
  cmkuji,
  competition,
  dropgame,
  easyGame,
  gacha,
  gesoten,
  horoscope,
  loginBonus,
  mailCheck,
  movieDeCoin,
  nazotore,
  news,
  omikuji,
  pointChance,
  pointQ,
  puzzle,
  spotdiff,
  stamprally,
  sugoroku,
  triangleLot,
} from './contents'

/**
 * PointTown クローラー
 */
export default class PointTownCrawler extends BaseCrawler {
  /**
   * コンテンツメソッド用のコンテキストを取得する
   */
  private get context(): PointTownContext {
    return {
      logger: this.logger,
      runMethod: this.runMethod.bind(this),
      getCurrentPoint: this.getCurrentPoint.bind(this),
      checkTriangleLot: this.checkTriangleLot.bind(this),
      checkNewsCoin: this.checkNewsCoin.bind(this),
      watchAdIfExists: this.watchAdIfExists.bind(this),
    }
  }

  /**
   * runMethod をオーバーライドして、各メソッド実行前後に広告ポップアップをチェックする
   *
   * 広告ポップアップはメソッド実行中にも表示されることがあり、表示された状態で
   * Puppeteer 操作を行うと CDP 接続がタイムアウトしてフリーズする（Issue #407）。
   * そのため、メソッド実行前後で広告ポップアップをチェックして閉じる。
   */
  public override async runMethod(
    page: Page,
    method: (page: Page) => Promise<void>,
    methodName?: string
  ): Promise<void> {
    // メソッド実行前に広告ポップアップをチェック（エラーは無視）
    try {
      await this.handleRewardedAd(page)
    } catch (error) {
      this.logger.warn('handleRewardedAd (before) failed', error as Error)
    }

    await super.runMethod(page, method, methodName)

    // メソッド実行後に広告ポップアップをチェック（エラーは無視）
    try {
      await this.handleRewardedAd(page)
    } catch (error) {
      this.logger.warn('handleRewardedAd (after) failed', error as Error)
    }
  }

  /**
   * ログイン処理
   * @param page ページ
   */
  protected async login(page: Page): Promise<void> {
    const config = getConfig()
    await page.goto('https://www.pointtown.com/login', {
      waitUntil: 'domcontentloaded',
    })

    await waitForUrl(
      page,
      'startsWith',
      'https://id.gmo.jp/gui/auth/login/sso',
      10_000
    )
      .then(async () => {
        await page
          .waitForSelector('input[type="email"]')
          .then((element) => element?.type(config.pointtown.email))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page
          .waitForSelector('input[type="password"]')
          .then((element) => element?.type(config.pointtown.password))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page
          .waitForSelector('button[type="submit"]')
          .then((element) => element?.focus())
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page
          .waitForSelector('button[type="submit"]')
          .then((element) => element?.click())
      })
      .catch(() => null)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    await waitForUrl(page, 'equal', 'https://www.pointtown.com/secure/question')
      .then(async () => {
        await page
          .waitForSelector('input[name="answerText"]')
          .then((element) => element?.type(config.pointtown.answer))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page
          .waitForSelector('button[type="submit"]')
          .then((element) => element?.focus())
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await page
          .waitForSelector('button[type="submit"]')
          .then((element) => element?.click())
      })
      .catch(() => null)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    await waitForUrl(page, 'equal', 'https://www.pointtown.com/')
  }

  /**
   * クロール処理
   * @param browser ブラウザ
   * @param page ページ
   */
  protected async crawl(browser: Browser, page: Page) {
    this.logger.info('crawl()')

    const beforePoint = await this.getCurrentPoint(page)
    this.logger.info(`beforePoint: ${beforePoint}`)

    await this.runMethod(page, (p) => loginBonus(this.context, p), 'loginBonus')
    await this.runMethod(
      page,
      (p) => triangleLot(this.context, p),
      'triangleLot'
    )
    await this.runMethod(page, (p) => pointQ(this.context, p), 'pointQ')
    await this.runMethod(page, (p) => mailCheck(this.context, p), 'mailCheck')
    await this.runMethod(
      page,
      (p) => pointChance(this.context, p),
      'pointChance'
    )
    await this.runMethod(
      page,
      (p) => competition(this.context, p),
      'competition'
    )
    await this.runMethod(page, (p) => easyGame(this.context, p), 'easyGame')
    await this.runMethod(page, (p) => gesoten(this.context, p), 'gesoten')
    await this.runMethod(page, (p) => news(this.context, p), 'news')

    // 新ゲーム
    await this.runMethod(
      page,
      (p) => brainTraining(this.context, p),
      'brainTraining'
    )
    await this.runMethod(page, (p) => nazotore(this.context, p), 'nazotore')
    await this.runMethod(page, (p) => spotdiff(this.context, p), 'spotdiff')
    await this.runMethod(page, (p) => puzzle(this.context, p), 'puzzle')
    await this.runMethod(page, (p) => sugoroku(this.context, p), 'sugoroku')
    await this.runMethod(page, (p) => dropgame(this.context, p), 'dropgame')
    await this.runMethod(page, (p) => cmkuji(this.context, p), 'cmkuji')
    await this.runMethod(
      page,
      (p) => movieDeCoin(this.context, p),
      'movieDeCoin'
    )

    // スマホ系
    const mobilePage = await browser.newPage()
    await this.runMethod(mobilePage, (p) => gacha(this.context, p), 'gacha')
    await this.runMethod(mobilePage, (p) => omikuji(this.context, p), 'omikuji')
    await this.runMethod(
      mobilePage,
      (p) => horoscope(this.context, p),
      'horoscope'
    )
    await mobilePage.close()

    // スタンプラリーの進捗確認
    await this.runMethod(page, (p) => stamprally(this.context, p), 'stamprally')

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.05)
  }

  /**
   * ログイン済みかどうかを確認する
   * @param page ページ
   * @returns ログイン済みの場合は true
   */
  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info('checkAlreadyLogin()')
    await page.goto('https://www.pointtown.com/mypage', {
      waitUntil: 'networkidle2',
    })

    // 秘密の質問ページにリダイレクトされた場合は未ログインと判定
    // 秘密の質問の入力は login() で行う
    if (page.url() === 'https://www.pointtown.com/secure/question') {
      this.logger.info(
        '秘密の質問ページにリダイレクトされたため、未ログインと判定'
      )
      return false
    }

    return await isExistsSelector(
      page,
      'ul.c-mypage-summary-sec__main a[href="/mypage/point-history"]'
    )
  }

  /**
   * 現在のポイントを取得する
   * @param page ページ
   * @returns ポイント数（取得できない場合は -1）
   */
  protected async getCurrentPoint(page: Page): Promise<number> {
    this.logger.info('getCurrentPoint()')
    await page.goto('https://www.pointtown.com/mypage', {
      waitUntil: 'networkidle2',
    })

    const nPointText = await page.evaluate((): string | null => {
      const element = document.querySelector(
        'ul.c-mypage-summary-sec__main a[href="/mypage/point-history"]'
      )
      return element?.textContent ?? null
    })
    if (nPointText == null) {
      return -1
    }
    const replaced = nPointText.replaceAll(',', '')
    return Number.parseInt(replaced, 10)
  }

  /**
   * 三角くじをチェックする
   * @param page ページ
   */
  async checkTriangleLot(page: Page): Promise<void> {
    await scrollToBottom(page)
    if (!(await isExistsSelector(page, 'button.link-sankaku-kuji'))) {
      this.logger.info('Already triangleLot')
      return
    }
    await page.evaluate(() =>
      document.querySelector('button.link-sankaku-kuji')?.scrollIntoView({
        block: 'center',
        inline: 'center',
      })
    )

    const waitNavigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle2',
    })
    await page
      .waitForSelector('button.link-sankaku-kuji')
      .then((element) => element?.click())
    await waitNavigationPromise

    const newPage = await getNewTabPageFromSelector(
      this.logger,
      page,
      'a#js-click-banner'
    )
    if (newPage == null) {
      this.logger.error('newPage not found.')
      return
    } else {
      await sleep(5000)
      await newPage.close()
    }
    await sleep(3000)

    // Wチャンス
    await page
      .waitForSelector('img.double-kuji-link')
      .then((element) => element?.click())
      .catch(() => null)
    await sleep(3000)
  }

  /**
   * ニュースコインの数をチェックする
   * @param page ページ
   * @returns コイン数（取得できない場合は null）
   */
  async checkNewsCoin(page: Page) {
    // サイトリニューアル後のセレクタに対応
    return await page
      .waitForSelector('.c-poitto-sec-header p.c-coin-label', {
        timeout: 5000,
      })
      .then(async (element) => {
        const coin = await page.evaluate(
          (element) => element?.textContent,
          element
        )
        return Number(coin?.replaceAll(',', ''))
      })
      .catch(() => null)
  }

  /**
   * 広告があれば視聴する
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
   * Google Rewarded Ads（広告ポップアップ）に対応する
   *
   * PointTown でも広告ポップアップが表示されることがあり、表示された状態で
   * Puppeteer 操作を行うと CDP 接続がタイムアウトしてフリーズする（Issue #407）。
   *
   * @param page ページ
   */
  private async handleRewardedAd(page: Page): Promise<void> {
    // 広告ポップアップのボタンを 3 秒間待機
    const rewardedAdButton = await page
      .waitForSelector('button.fc-rewarded-ad-button', { timeout: 3000 })
      .catch(() => null)

    if (!rewardedAdButton) {
      return
    }

    this.logger.info('広告ポップアップを検出')

    // 「広告を見る」ボタンをクリック
    try {
      await rewardedAdButton.evaluate((el) => {
        ;(el as HTMLElement).click()
      })
      this.logger.info('広告再生開始')
    } catch {
      this.logger.warn('広告ボタンのクリックに失敗')
      return
    }

    // 広告視聴を待機（最大 60 秒）
    const startTime = Date.now()
    const maxWaitTime = 60_000

    while (Date.now() - startTime < maxWaitTime) {
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
          await closeButton.evaluate((el) => {
            ;(el as HTMLElement).click()
          })
          this.logger.info('閉じるボタンをクリック')
          await sleep(2000)
          break
        } catch {
          this.logger.warn('閉じるボタンのクリックに失敗')
        }
      }

      await sleep(1000)
    }

    await sleep(2000)
  }
}
