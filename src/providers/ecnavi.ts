import { BaseCrawler } from '@/base-provider'
import { getConfig } from '@/configuration'
import {
  finishedNotify,
  getNewTabPage,
  isExistsSelector,
  sleep,
  waitForUrl,
} from '@/functions'
import { Browser, Page } from 'puppeteer-core'

export default class EcNaviCrawler extends BaseCrawler {
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

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info('checkAlreadyLogin()')
    await page.goto('https://ecnavi.jp/mypage/', {
      waitUntil: 'networkidle2',
    })
    return isExistsSelector(page, 'p.user-current__name')
  }

  protected async crawl(_: Browser, page: Page): Promise<void> {
    this.logger.info('crawl()')

    const beforePoint = await this.getCurrentPoint(page)
    this.logger.info(`beforePoint: ${beforePoint}`)

    // 一番最初にエントリー
    await this.runMethod(page, this.entryLottery.bind(this))

    await this.runMethod(page, this.gesoten.bind(this))
    await this.runMethod(page, this.chirashi.bind(this))
    await this.runMethod(page, this.chinju.bind(this))
    await this.runMethod(page, this.quiz.bind(this))
    await this.runMethod(page, this.divination.bind(this))
    await this.runMethod(page, this.fishing.bind(this))
    await this.runMethod(page, this.choice.bind(this))
    await this.runMethod(page, this.news.bind(this))
    await this.runMethod(page, this.garapon.bind(this))
    await this.runMethod(page, this.doron.bind(this))
    await this.runMethod(page, this.ticketingLottery.bind(this))
    await this.runMethod(page, this.fund.bind(this))

    // 新ゲーム
    await this.runMethod(page, this.natsupoi.bind(this))
    await this.runMethod(page, this.spotdiffBox.bind(this))
    await this.runMethod(page, this.languageTravel.bind(this))
    await this.runMethod(page, this.brainExerciseGame.bind(this))
    await this.runMethod(page, this.easyGame.bind(this))
    await this.runMethod(page, this.brainTraining.bind(this))
    await this.runMethod(page, this.vegetable.bind(this))
    await this.runMethod(page, this.chocoRead.bind(this))

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.1)
  }

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

  protected async gesoten(page: Page) {
    this.logger.info('gesoten()')

    await page.goto('https://ecnavi.jp/gesoten/redirect/', {
      waitUntil: 'networkidle2',
    })

    await page.goto('https://gd.gesoten.com/m/ap-ecnavi-games/reward/gacha', {
      waitUntil: 'networkidle2',
    })

    const games = await page.$$(
      'ul#reward-gacha-mission-game-contents div.c-gacha-list-card__action a'
    )
    for (const game of games) {
      const url = await page.evaluate((element) => element.href, game)
      this.logger.info(`open ${url}`)

      const newPage = await page.browser().newPage()
      await newPage.goto(url, {
        waitUntil: 'networkidle2',
      })
      await sleep(3000)
      await newPage.close()
    }

    while (true) {
      if (!(await isExistsSelector(page, 'button.c-gacha-ticket__action'))) {
        break
      }
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button.c-gacha-ticket__action'),
      ])
      await sleep(3000)
      await page.goto('https://gd.gesoten.com/reward/gacha', {
        waitUntil: 'networkidle2',
      })
    }
  }

  protected async chirashi(page: Page) {
    this.logger.info('chirashi()')

    await page.goto('https://ecnavi.jp/contents/chirashi/', {
      waitUntil: 'networkidle2',
    })

    const chirashis = await page.$$('a.chirashi_link')
    for (const chirashi of chirashis.slice(0, 2)) {
      const url = await page.evaluate((element) => element.href, chirashi)
      this.logger.info(`open ${url}`)

      const newPage = await page.browser().newPage()
      await newPage.goto(url, {
        waitUntil: 'networkidle2',
      })
      await sleep(3000)
      await newPage.close()
    }
  }

  protected async chinju(page: Page) {
    this.logger.info('chinju()')

    // for (let index = 0; index < 5; index++) {
    await page.goto('https://ecnavi.jp/research/chinju_lesson/', {
      waitUntil: 'networkidle2',
    })
    if (await isExistsSelector(page, 'div.chinju-lesson-finished')) {
      this.logger.info('chinju() today finished')
      return
    }
    if (await isExistsSelector(page, 'div.chinju-lesson-interbal')) {
      /* await new Promise<void>((resolve) => {
        setInterval(async () => {
          if (!(await isExistsSelector(page, 'div.chinju-lesson-interbal'))) {
            resolve()
          }
        }, 1000)
      })
      */
      return
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page
        .waitForSelector('a.chinju-lesson-question__link')
        .then((element) => element?.click()),
    ])
    // }
  }

  protected async quiz(page: Page) {
    this.logger.info('quiz()')

    await page.goto('https://ecnavi.jp/contents/quiz/', {
      waitUntil: 'networkidle2',
    })

    if (!(await isExistsSelector(page, 'p.todays-quiz__text'))) {
      return
    }

    const questionElement = await page.$('p.todays-quiz__text')
    const question = await page.evaluate(
      (element) => element?.textContent,
      questionElement
    )
    this.logger.info(`question: ${question}`)
    if (!question) {
      return
    }

    const hintElement = await page.$('a.king-of-quiz__button')
    const hintUrl =
      (await page.evaluate((element) => element?.href ?? null, hintElement)) ??
      'about:blank'
    this.logger.info(`hint: ${hintUrl}`)
    const hintPage = await page.browser().newPage()
    await hintPage.goto(hintUrl, {
      waitUntil: 'networkidle2',
    })
    const hint = await hintPage.evaluate((): string => {
      const body = document.querySelector('body')
      return body?.textContent ?? ''
    })
    await hintPage.close()

    const answers = await page.$$('ul.choices__list button')
    let isFoundAnswer = false
    for (const answer of answers) {
      const text = await page.evaluate((element) => element.textContent, answer)
      if (!text) {
        continue
      }
      this.logger.info(`answer: ${text}`)
      if (hint.includes(text)) {
        isFoundAnswer = true
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          answer.click(),
        ])
        break
      }
    }
    if (!isFoundAnswer) {
      this.logger.info('not found answer')

      await answers[Math.floor(Math.random() * answers.length)].click()
    }
  }

  protected async divination(page: Page) {
    this.logger.info('divination()')

    await page.goto(
      'https://ecnavi.jp/contents/divination/western_astrology/',
      {
        waitUntil: 'networkidle2',
      }
    )

    await page
      .waitForSelector('ul.western-astrology-list button')
      .then((element) => element?.click())
    await sleep(3000)

    await page.goto('https://ecnavi.jp/contents/divination/tarot/', {
      waitUntil: 'networkidle2',
    })

    await page
      .waitForSelector('ul.draw-tarot button')
      .then((element) => element?.click())
    await sleep(3000)

    await page.goto('https://ecnavi.jp/contents/divination/omikuji/', {
      waitUntil: 'networkidle2',
    })

    await page
      .waitForSelector('button.draw-omikuji__button')
      .then((element) => element?.click())
    await sleep(10_000)
  }

  protected async fishing(page: Page) {
    this.logger.info('fishing()')

    await page.goto('https://ecnavi.jp/game/fishing/play/', {
      waitUntil: 'networkidle2',
    })

    if (!(await isExistsSelector(page, '#home .function button.gacha'))) {
      return
    }

    await page
      .waitForSelector('#home .function button.gacha')
      .then((element) => element?.click())
    await sleep(5000)

    await page
      .waitForSelector('#home .gacha div.scene_1 button.common')
      .then((element) => element?.click())
    await sleep(5000)
  }

  protected async choice(page: Page) {
    this.logger.info('choice()')

    await page.goto('https://ecnavi.jp/vote/choice/', {
      waitUntil: 'networkidle2',
    })

    if (!(await isExistsSelector(page, 'ul.answer_botton button'))) {
      return
    }

    await page
      .waitForSelector('ul.answer_botton button')
      .then((element) => element?.click())
    await sleep(3000)
  }

  protected async news(page: Page) {
    this.logger.info('news()')

    await page.goto('https://ecnavi.jp/mainichi_news/#goog_rewarded', {
      waitUntil: 'networkidle2',
    })
    const items = await page.$$(
      'li.article-latest-item a.article-latest-item__link'
    )
    for (const item of items.slice(0, 5)) {
      const url = await page.evaluate((element) => element.href, item)
      const newsPage = await page.browser().newPage()
      await newsPage.goto(url, {
        waitUntil: 'networkidle2',
      })

      await newsPage.evaluate(() => {
        if (document.querySelector('p.article-reaction-status') != null) {
          document.querySelector('p.article-reaction-status')?.scrollIntoView()
        }
      })

      await newsPage
        .waitForSelector('button.article-reaction__feeling-button')
        .then((element) => element?.click())
        .catch(() => null)
      await sleep(3000)
      await newsPage.close()
    }
  }

  protected async entryLottery(page: Page) {
    this.logger.info('entryLottery()')

    await page.goto('https://ecnavi.jp/game/lottery/', {
      waitUntil: 'networkidle2',
    })

    if (await isExistsSelector(page, 'p.btn_entry a')) {
      await page
        .waitForSelector('p.btn_entry a')
        .then((element) => element?.click())
      await sleep(5000)
    }
  }

  protected async garapon(page: Page) {
    await page.goto('https://ecnavi.jp/game/lottery/garapon/', {
      waitUntil: 'networkidle2',
    })
    await page.evaluate(() => {
      if (document.querySelector('p.bnr') != null) {
        document.querySelector('p.bnr')?.scrollIntoView()
      }
    })

    const anchers = await page.$$('p.bnr > a')
    for (const a of anchers) {
      const newPage = await getNewTabPage(this.logger, page, a)
      if (newPage == null) {
        continue
      }
      await sleep(1000)
      await newPage.close()
    }
  }

  protected async doron(page: Page) {
    this.logger.info('doron()')

    await page.goto('https://ecnavi.jp/contents/doron/', {
      waitUntil: 'networkidle2',
    })

    await page
      .waitForSelector('ul.character-tanuki a')
      .then(async (element) => {
        const newPage = await getNewTabPage(this.logger, page, element)
        if (newPage == null) {
          return
        }
        await sleep(1000)
        await newPage.close()
        await sleep(1000)
      })

    await page
      .waitForSelector('ul.character-kitsune a')
      .then(async (element) => {
        const newPage = await getNewTabPage(this.logger, page, element)
        if (newPage == null) {
          return
        }
        await sleep(1000)
        await newPage.close()
        await sleep(1000)
      })
  }

  protected async ticketingLottery(page: Page) {
    this.logger.info('lottery()')

    await page.goto('https://ecnavi.jp/game/lottery/', {
      waitUntil: 'networkidle2',
    })
    await page
      .waitForSelector('p.btn_ikkatsu')
      .then((element) => element?.click())
      .catch(() => null)
    await sleep(1000)
  }

  protected async fund(page: Page) {
    this.logger.info('fund()')

    await page.goto('https://ecnavi.jp/smile_project/click_fund/', {
      waitUntil: 'networkidle2',
    })

    await page
      .waitForSelector('ul.click-fund-contents li:nth-child(1) a')
      .then(async (element) => {
        const newPage = await getNewTabPage(this.logger, page, element)
        if (newPage == null) {
          return
        }
        await sleep(1000)
        await newPage.close()
        await sleep(1000)
      })

    await page
      .waitForSelector('ul.click-fund-contents li:nth-child(2) a')
      .then(async (element) => {
        const newPage = await getNewTabPage(this.logger, page, element)
        if (newPage == null) {
          return
        }
        await sleep(1000)
        await newPage.close()
        await sleep(1000)
      })
  }

  /**
   * 広告があれば視聴する共通処理
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
   * ナツポイ
   *
   * ecnavi.natsupoi.com にリダイレクトされる。
   * ゲームをプレイしてポイントを獲得する。
   */
  protected async natsupoi(page: Page) {
    this.logger.info('natsupoi()')

    await page.goto('https://ecnavi.jp/natsupoi/redirect/', {
      waitUntil: 'networkidle2',
    })

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // ゲーム開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("プレイ")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(10_000)
    }

    await sleep(5000)
  }

  /**
   * まちがい探し
   *
   * ecnavi.kantangame.com/spotdiff にリダイレクトされる。
   * 間違い探しゲームをプレイしてスタンプを獲得する。
   */
  protected async spotdiffBox(page: Page) {
    this.logger.info('spotdiffBox()')

    await page.goto('https://ecnavi.jp/spotdiff_box/redirect/', {
      waitUntil: 'networkidle2',
    })

    // 挑戦ボタンをクリック
    const challengeButton = await page
      .waitForSelector('button:has-text("挑戦"), a:has-text("挑戦")', {
        timeout: 5000,
      })
      .catch(() => null)

    if (challengeButton) {
      await challengeButton.click()
      await sleep(3000)
    }

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // ゲーム画面で待機
    await sleep(10_000)
  }

  /**
   * 語学トラベル
   *
   * 英語学習クイズでポイントを獲得する。
   */
  protected async languageTravel(page: Page) {
    this.logger.info('languageTravel()')

    await page.goto('https://ecnavi.jp/contents/language_travel/', {
      waitUntil: 'networkidle2',
    })

    // クイズ開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("スタート"), button:has-text("はじめる"), a:has-text("挑戦")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(3000)
    }

    // クイズに回答
    for (let i = 0; i < 5; i++) {
      const answerButtons = await page.$$(
        'button[class*="answer"], button[class*="choice"]'
      )
      if (answerButtons.length === 0) break

      const randomIndex = Math.floor(Math.random() * answerButtons.length)
      await answerButtons[randomIndex].click()
      await sleep(3000)
    }

    await sleep(3000)
  }

  /**
   * 頭の体操ゲーム
   *
   * ecnavi.ib-game.jp/stamp にリダイレクトされる。
   * 脳トレゲームをプレイしてスタンプを獲得する。
   */
  protected async brainExerciseGame(page: Page) {
    this.logger.info('brainExerciseGame()')

    await page.goto('https://ecnavi.jp/brain_exercise_game/redirect/', {
      waitUntil: 'networkidle2',
    })

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // ゲーム開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("プレイ")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(10_000)
    }

    await sleep(5000)
  }

  /**
   * かんたんゲーム
   *
   * ecnavi.kantangame.com/easygame にリダイレクトされる。
   * シンプルなゲームをプレイしてスタンプを獲得する。
   */
  protected async easyGame(page: Page) {
    this.logger.info('easyGame()')

    await page.goto('https://ecnavi.jp/easy_game/redirect/', {
      waitUntil: 'networkidle2',
    })

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // ゲーム開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("スタート"), button:has-text("はじめる"), button:has-text("挑戦")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(10_000)
    }

    await sleep(5000)
  }

  /**
   * 脳トレクイズ
   *
   * ecnavi.kantangame.com/quiz にリダイレクトされる。
   * クイズに回答してスタンプを獲得する。
   */
  protected async brainTraining(page: Page) {
    this.logger.info('brainTraining()')

    await page.goto('https://ecnavi.jp/brain_training/redirect/', {
      waitUntil: 'networkidle2',
    })

    // 開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("つづきから"), button:has-text("はじめる"), a:has-text("挑戦")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(3000)
    }

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // クイズに回答
    for (let i = 0; i < 10; i++) {
      const answerButtons = await page.$$(
        'button[class*="answer"], li[class*="choice"] button'
      )
      if (answerButtons.length === 0) break

      const randomIndex = Math.floor(Math.random() * answerButtons.length)
      await answerButtons[randomIndex].click()
      await sleep(2000)

      // 次へボタン
      const nextButton = await page
        .$('button:has-text("次へ"), a:has-text("次へ")')
        .catch(() => null)
      if (nextButton) {
        await nextButton.click()
        await sleep(2000)
      }
    }

    await sleep(3000)
  }

  /**
   * ポイント畑
   *
   * クレーンゲーム形式で野菜を収穫してポイントを獲得する。
   * ①右 →②下 の順でアームを操作する。
   */
  protected async vegetable(page: Page) {
    this.logger.info('vegetable()')

    await page.goto('https://ecnavi.jp/game/vegetable/', {
      waitUntil: 'networkidle2',
    })

    // はじめるボタンをクリック
    const startButton = await page
      .waitForSelector('img[alt*="はじめる"], a:has-text("はじめる")', {
        timeout: 5000,
      })
      .catch(() => null)

    if (startButton) {
      await startButton.click()
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

  /**
   * ちょこ読み
   *
   * 雑誌を読んでポイントを獲得する。
   * 無料チケットで読み、ページをめくって最後までいくとポイントが獲得できる。
   */
  protected async chocoRead(page: Page) {
    this.logger.info('chocoRead()')

    await page.goto('https://ecnavi.jp/contents/chocoyomi/', {
      waitUntil: 'networkidle2',
    })

    // 「今すぐ読んでポイントゲット」ボタンをクリック
    const directLinkButton = await page
      .waitForSelector('a.chocoyomi-direct-link__button', { timeout: 5000 })
      .catch(() => null)

    if (!directLinkButton) {
      this.logger.info('ちょこ読みのボタンが見つかりません')
      return
    }

    await Promise.all([
      directLinkButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ])

    // 無料チケットで読む
    const rentalButton = await page
      .waitForSelector('button.chocoyomi-ad-page__button.button-rental', {
        timeout: 5000,
      })
      .catch(() => null)

    if (!rentalButton) {
      this.logger.info('無料チケットボタンが見つかりません')
      return
    }

    await rentalButton.click()
    await sleep(1000)

    // チケットの使用確認: はい
    const confirmButton = await page
      .waitForSelector('button.p_dialog__button.c_red', { timeout: 5000 })
      .catch(() => null)

    if (confirmButton) {
      await confirmButton.click()
      await sleep(2000)
    }

    // 左側をクリックしてページをめくる（なくなるまで）
    let pageCount = 0
    const maxPages = 50 // 無限ループ防止
    while (
      pageCount < maxPages &&
      (await isExistsSelector(
        page,
        'button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]'
      ))
    ) {
      const leftButton = await page
        .waitForSelector('button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]', {
          timeout: 3000,
        })
        .catch(() => null)

      if (!leftButton) break

      await leftButton.click()
      await sleep(1000)
      pageCount++
    }

    this.logger.info(`ページをめくりました: ${pageCount} ページ`)

    // ポイント獲得ボタンをクリック
    const pointButton = await page
      .waitForSelector('button.chocoyomi-ad-page__button.button-point', {
        timeout: 5000,
      })
      .catch(() => null)

    if (pointButton) {
      await pointButton.click()
      await sleep(1000)
    }
  }
}
