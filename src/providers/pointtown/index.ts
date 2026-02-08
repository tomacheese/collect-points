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

    // リトライロジック（最大 3 回試行）
    for (let retry = 0; retry < 3; retry++) {
      try {
        await page.goto('https://www.pointtown.com/mypage', {
          waitUntil: 'domcontentloaded',
          timeout: 180_000, // 3 分に延長
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
      } catch (error) {
        if (retry < 2) {
          this.logger.warn(
            `getCurrentPoint: リトライ ${retry + 1}/3 (${(error as Error).message})`
          )
          await sleep(10_000) // 10 秒待機してリトライ
          continue
        }
        this.logger.error('getCurrentPoint: 3 回リトライしましたが失敗しました')
        throw error
      }
    }
    return -1
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
}
