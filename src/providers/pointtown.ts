import { BaseCrawler } from '@/base-provider'
import { getConfig } from '@/configuration'
import {
  finishedNotify,
  getNewTabPage,
  getNewTabPageFromSelector,
  isExistsSelector,
  scrollToBottom,
  sleep,
  waitForUrl,
} from '@/functions'
import fs from 'node:fs'
import { Browser, Page, KnownDevices } from 'puppeteer-core'

export default class PointTownCrawler extends BaseCrawler {
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

  protected async crawl(browser: Browser, page: Page) {
    this.logger.info('crawl()')

    const beforePoint = await this.getCurrentPoint(page)
    this.logger.info(`beforePoint: ${beforePoint}`)

    await this.runMethod(page, this.loginBonus.bind(this))
    await this.runMethod(page, this.triangleLot.bind(this))
    await this.runMethod(page, this.pointQ.bind(this))
    await this.runMethod(page, this.mailCheck.bind(this))
    await this.runMethod(page, this.pointChance.bind(this))
    await this.runMethod(page, this.competition.bind(this))
    await this.runMethod(page, this.easyGame.bind(this))
    await this.runMethod(page, this.gesoten.bind(this))
    await this.runMethod(page, this.news.bind(this))
    await this.runMethod(page, this.chocoRead.bind(this))
    await this.runMethod(page, this.questionnaire.bind(this))

    // 新ゲーム
    await this.runMethod(page, this.brainTraining.bind(this))
    await this.runMethod(page, this.nazotore.bind(this))
    await this.runMethod(page, this.spotdiff.bind(this))
    await this.runMethod(page, this.puzzle.bind(this))
    await this.runMethod(page, this.sugoroku.bind(this))
    await this.runMethod(page, this.dropgame.bind(this))
    await this.runMethod(page, this.cmkuji.bind(this))

    // スマホ系
    const mobilePage = await browser.newPage()
    await this.runMethod(mobilePage, this.gacha.bind(this))
    await this.runMethod(mobilePage, this.omikuji.bind(this))
    await this.runMethod(mobilePage, this.horoscope.bind(this))
    await mobilePage.close()

    // スタンプラリーの進捗確認
    await this.runMethod(page, this.stamprally.bind(this))

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.05)
  }

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info('checkAlreadyLogin()')
    await page.goto('https://www.pointtown.com/mypage', {
      waitUntil: 'networkidle2',
    })

    // 秘密の質問が出ることがある。待ちは不要
    const config = getConfig()
    waitForUrl(page, 'equal', 'https://www.pointtown.com/secure/question')
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

    return await isExistsSelector(
      page,
      'ul.c-mypage-summary-sec__main a[href="/mypage/point-history"]'
    )
  }

  async getCurrentPoint(page: Page): Promise<number> {
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
   * ログインボーナス
   * @param page ページ
   */
  async loginBonus(page: Page): Promise<void> {
    this.logger.info('loginBonus()')

    await page.goto('https://www.pointtown.com/', {
      waitUntil: 'networkidle2',
    })

    // ログインボーナスのポップアップが表示されるまで待つ
    const rewardButton = await page
      .waitForSelector('a[href="/login-bonus/"]', {
        visible: true,
        timeout: 5000,
      })
      .catch(() => null)

    if (rewardButton === null) {
      this.logger.info('ログインボーナスのポップアップが表示されていません')
      return
    }

    // 「報酬を受け取る」ボタンをクリック
    await rewardButton.click()
    await sleep(3000)

    // 宝箱選択画面が表示された場合、閉じる（広告が必要なためスキップ）
    const closeButton = await page
      .waitForSelector('button.c-modal__close, a[href="/"]', {
        visible: true,
        timeout: 3000,
      })
      .catch(() => null)

    if (closeButton !== null) {
      await closeButton.click().catch(() => null)
    }

    this.logger.info('ログインボーナス完了')
  }

  /**
   * 三角くじ
   * @param page ページ
   */
  async triangleLot(page: Page): Promise<void> {
    this.logger.info('triangleLot()')

    await this.runMethod(page, this.triangleLotRed.bind(this))
    await this.runMethod(page, this.triangleLotYellow.bind(this))
    await this.runMethod(page, this.triangleLotPurple.bind(this))
    await this.runMethod(page, this.triangleLotPink.bind(this))
    await this.runMethod(page, this.triangleLotBlue.bind(this))
    await this.runMethod(page, this.triangleLotGreen.bind(this))
  }

  async triangleLotRed(page: Page): Promise<void> {
    this.logger.info('triangleLotRed()')
    await page.goto('https://www.pointtown.com/ptu/shopping', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

  async triangleLotYellow(page: Page): Promise<void> {
    this.logger.info('triangleLotYellow()')
    await page.goto('https://www.pointtown.com/enquete', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

  async triangleLotPurple(page: Page): Promise<void> {
    this.logger.info('triangleLotPurple()')
    await page.goto('https://www.pointtown.com/category/service/creditcard', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

  async triangleLotPink(page: Page): Promise<void> {
    this.logger.info('triangleLotPink()')
    await page.goto('https://www.pointtown.com/popular/list/occurrence-count', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

  async triangleLotBlue(page: Page): Promise<void> {
    this.logger.info('triangleLotBlue()')
    await page.goto('https://www.pointtown.com/recent', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

  async triangleLotGreen(page: Page): Promise<void> {
    this.logger.info('triangleLotBlue()')
    await page.goto('https://www.pointtown.com/feature', {
      waitUntil: 'networkidle2',
    })

    await this.checkTriangleLot(page)
  }

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
   * ポイントQ
   * @param page ページ
   */
  async pointQ(page: Page): Promise<void> {
    this.logger.info('pointQ()')
    await page.goto('https://www.pointtown.com/pointq/input', {
      waitUntil: 'networkidle2',
    })
    if (!(await isExistsSelector(page, 'form#js-quiz-form h3'))) {
      this.logger.info('Already pointQ')
      return
    }

    while (true) {
      const question = await page.evaluate(
        () => document.querySelector('form#js-quiz-form h3')?.textContent
      )
      if (question == null) {
        this.logger.error('question not found.')
        return
      }
      this.logger.info(`question: ${question}`)
      const labels = await page.$$(
        'form#js-quiz-form li.pointq-radio-item label'
      )
      const json: Record<string, string | undefined> = fs.existsSync(
        '/data/pointq.json'
      )
        ? JSON.parse(fs.readFileSync(`/data/pointq.json`, 'utf8'))
        : {}
      if (json[question] === undefined) {
        this.logger.info(`dont know answer...`)
        let index
        if (labels.length > 0) {
          index = Math.floor(Math.random() * labels.length)
          await labels[index].click()
        }
      } else {
        const answer = json[question]
        this.logger.info(`know answer: ${answer}`)
        let choicebool = false
        for (const [l, label] of labels.entries()) {
          const choice = await page.evaluate(
            (label) => label.textContent,
            label
          )
          this.logger.info(`choice ${l}: ${choice}`)
          if (choice === answer) {
            this.logger.info(`this!`)
            await label.click()
            choicebool = true
            break
          }
        }
        if (!choicebool) {
          this.logger.info(`choice error...`)
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete json[question]
          let index
          if (labels.length > 0) {
            index = Math.floor(Math.random() * labels.length)
            await labels[index].click()
          }
        }
      }

      await page
        .waitForSelector('button#js-pointq-submit', {
          visible: true,
          timeout: 10_000,
        })
        .then((element) => element?.click())

      await page.waitForSelector('p.pointq-correct-answer')
      const trueanswer = await page.evaluate(() => {
        const text =
          document.querySelector('p.pointq-correct-answer')?.textContent ?? ''
        const segments = text.split('：')
        return segments.length > 1 ? segments[1] : ''
      })
      this.logger.info(`trueanswer: ${trueanswer}`)
      json[question] = trueanswer
      fs.writeFileSync(`/data/pointq.json`, JSON.stringify(json))

      if (await isExistsSelector(page, 'a[href="/pointq/input"]')) {
        await Promise.all([
          page
            .waitForSelector('a[href="/pointq/input"]')
            .then((element) => element?.click()),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ])
      } else if (await isExistsSelector(page, 'div.rewardResumebutton')) {
        await Promise.all([
          page
            .waitForSelector('div.rewardResumebutton')
            .then((element) => element?.click()),
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ])
      } else {
        return
      }
    }
  }

  /**
   * ポイントメールボックス
   * @param page ページ
   */
  async mailCheck(page: Page): Promise<void> {
    this.logger.info('mail_check()')
    await page.goto('https://www.pointtown.com/ptu/mailbox', {
      waitUntil: 'networkidle2',
    })

    if (!(await isExistsSelector(page, 'ul.c-point-mail-table__row'))) {
      this.logger.info('"ul.c-point-mail-table__row" is not found')
      return
    }
    const mails = await page.$$('ul.c-point-mail-table__row')
    for (const a of mails) {
      if ((await a.$('p.c-coin-label')) == null) {
        this.logger.info('not point... continue!')
        continue
      }
      this.logger.info('point.')
      const title = await a.$('a.c-point-mail-table__l-title')
      if (title == null) {
        this.logger.error('title not found.')
        continue
      }

      const href = await page.evaluate((element) => element.href, title)
      if (!href) {
        this.logger.error('url not found.')
        continue
      }
      const regex = /\/mypage\/mail\/(\d+)/
      const match = regex.exec(href)
      if (match == null) {
        this.logger.error('match not found.')
        continue
      }
      const mailId = match[1]
      this.logger.info(`Mail ID: ${mailId}`)

      const newPage = await page.browser().newPage()
      await newPage.goto(
        `https://www.pointtown.com/mypage/mail/body/${mailId}`,
        {
          waitUntil: 'networkidle2',
        }
      )
      const text = await newPage.evaluate(() => {
        return document.body.innerHTML
      })

      const patterns = [
        /\[Point] ?(https?:\/\/.+)/,
        /href="(https:\/\/www\.pointtown\.com\/mail\/click.+?)"/,
      ]
      const matches = patterns
        .map((pattern) => text.match(pattern))
        .find((x) => x != null)

      if (matches == null) {
        this.logger.info('matches not found.')
        await newPage.close()
        continue
      }

      const url = matches[1].replaceAll('&amp;', '&')
      if (url === '') {
        this.logger.info('url not found.')
        await newPage.close()
        continue
      }
      this.logger.info(`Url: ${url}`)
      const newPage2 = await page.browser().newPage()
      await newPage2.emulate(KnownDevices['iPhone 13 Pro'])
      await newPage2.goto(url, { waitUntil: 'networkidle2' })
      await newPage2
        .waitForSelector('label.itp-form__label', {
          timeout: 10_000,
        })
        .then((element) => element?.click())
        .catch(() => null)
      await newPage2
        .waitForSelector('button.btn-default', {
          timeout: 3000,
        })
        .then((element) => element?.click())
        .catch(() => null)
      await sleep(10_000)
      await newPage2.close()
      await newPage.close()
    }
  }

  /**
   * ポイントチャンス (モニター下部)
   *
   * 注意: 2024年以降、この機能はサイトから削除された可能性があります。
   * 要素が見つからない場合は早期リターンします。
   *
   * @param page ページ
   */
  async pointChance(page: Page): Promise<void> {
    this.logger.info('pointChance()')
    await page.goto(
      'https://www.pointtown.com/monitor/fancrew/real-shop#link-coin-chance',
      { waitUntil: 'networkidle2' }
    )
    const notObtainedElement = await page.$(
      'div.c-coin-chance-sec__status p.c-coin-label'
    )
    if (notObtainedElement == null) {
      this.logger.info(
        'コインチャンスセクションが見つかりません（この機能は廃止された可能性があります）'
      )
      return
    }
    const notObtained = await notObtainedElement.evaluate(
      (element): string | null => element.textContent
    )
    if (notObtained == null) {
      this.logger.info('notObtained not found.')
      return
    }
    if (Number(notObtained) === 0) {
      this.logger.info('notObtained is 0.')
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

      const newPage = await getNewTabPage(this.logger, page, button)
      if (newPage == null) {
        this.logger.error('newPage not found.')
      } else {
        await sleep(5000)
        await newPage.close()
      }
    }
  }

  /**
   * ポイント争奪戦
   * @param page ページ
   */
  async competition(page: Page): Promise<void> {
    this.logger.info('competition()')
    await page.goto('https://www.pointtown.com/soudatsu', {
      waitUntil: 'networkidle2',
    })
    try {
      await Promise.all([
        page
          .waitForSelector('main form button[type="submit"]', {
            visible: true,
            timeout: 3000,
          })
          .then((element) => element?.click()),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ])
    } catch (error) {
      this.logger.info((error as Error).message)
    }
  }

  async easyGame(page: Page): Promise<void> {
    this.logger.info('easyGame()')
    await page.goto('https://www.pointtown.com/game/redirect/easygame', {
      waitUntil: 'networkidle2',
    })

    // 抽選に参加できるボタンをクリック（サイトリニューアル後のセレクタ）
    await page
      .waitForSelector('a.c-n-side-profile__pop', {
        visible: true,
        timeout: 5000,
      })
      .then((element) => element?.click())
      .catch(() => null)
  }

  /**
   * ゲソてん
   * @param page ページ
   */
  async gesoten(page: Page): Promise<void> {
    this.logger.info('easyGame()')

    await page.goto('https://www.pointtown.com/gesoten/redirect', {
      waitUntil: 'networkidle2',
    })

    const games = await page.$$('li.c-card-game a')
    for (const game of games) {
      const url = await page.evaluate((element) => element.href, game)
      if (!url) {
        this.logger.error('url not found.')
        continue
      }
      const newPage = await page.browser().newPage()
      newPage.on('dialog', (dialog) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        dialog.accept().then(() => {
          this.logger.info('dialog accepted.')
        })
      })
      try {
        await newPage.goto(url, { waitUntil: 'networkidle2' })
      } catch (error) {
        this.logger.error('Error', error as Error)
      }
      await newPage.close()
    }
  }

  async news(page: Page): Promise<void> {
    this.logger.info('news()')

    await page.goto('https://www.pointtown.com/news/infoseek', {
      waitUntil: 'networkidle2',
    })

    if ((await this.checkNewsCoin(page)) === 0) {
      this.logger.info('news coin is 0.')
      return
    }

    const links = await page.$$(
      'a.js-news-infoseek-article-link[data-is-completed="false"]'
    )
    for (const link of links.slice(0, 20)) {
      const url = await page.evaluate((element) => element.href, link)
      if (!url) {
        this.logger.error('url not found.')
        continue
      }
      const newPage = await page.browser().newPage()
      try {
        await newPage.goto(url, { waitUntil: 'networkidle2' })
      } catch (error) {
        this.logger.error('Error', error as Error)
      }
      await newPage.close()
    }

    const buttons = await page.$$('button.js-news-infoseek-article-submit')
    this.logger.info(`buttons.length: ${buttons.length}`)

    for (let index = 0; index < buttons.length; index++) {
      this.logger.info(`click index: ${index}`)
      const buttonList = await page.$$(`button.js-news-infoseek-article-submit`)
      const button = buttonList[index]
      // styleがnoneではないこと
      const style = await page.evaluate(
        (element) => element.style.display,
        button
      )
      if (style === 'none') {
        continue
      }
      await button.evaluate((element) => {
        element.scrollIntoView()
      }, button)
      await Promise.all([
        button.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]).catch(() => null)

      if ((await this.checkNewsCoin(page)) === 0) {
        this.logger.info('news coin is 0.')
        return
      }
    }
  }

  async chocoRead(page: Page): Promise<void> {
    this.logger.info('chocoRead()')

    await page.goto('https://ecnavi.jp/contents/chocoyomi/', {
      waitUntil: 'networkidle2',
    })

    await Promise.all([
      page
        .waitForSelector('a.chocoyomi-direct-link__button')
        .then((element) => element?.click()),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ])

    // 無料チケットで読む
    await page
      .waitForSelector('button.chocoyomi-ad-page__button.button-rental')
      .then((element) => element?.click())

    // チェットの使用確認: はい
    await page
      .waitForSelector('button.p_dialog__button.c_red')
      .then((element) => element?.click())

    // 左側をクリック。なくなるまで
    while (
      await isExistsSelector(
        page,
        'button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]'
      )
    ) {
      await page
        .waitForSelector('button[data-testid="TestId__LEFT_PAGE_NAVIGATION"]')
        .then((element) => element?.click())

      await sleep(1000)
    }

    await page
      .waitForSelector('button.chocoyomi-ad-page__button.button-point')
      .then((element) => element?.click())

    await sleep(1000)
  }

  async questionnaire(page: Page): Promise<void> {
    this.logger.info('questionnaire()')

    await page.goto('https://ecnavi.jp/contents/enquete_rally/', {
      waitUntil: 'networkidle2',
    })

    // input[name="enquete_fields"] のいずれかをクリック
    const elements = await page.$$('input[name="enquete_fields"]')
    for (const element of elements) {
      await element.click()
    }

    // 回答する
    await page
      .waitForSelector('button.question-area__button.c_red')
      .then((element) => element?.click())

    await sleep(1000)
  }

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

  async gacha(page: Page): Promise<void> {
    this.logger.info('gacha()')

    await page.emulate(KnownDevices['iPhone 12 Pro'])

    await page.goto('https://www.pointtown.com/gacha/play', {
      waitUntil: 'networkidle2',
    })
    await sleep(10_000)
  }

  async omikuji(page: Page): Promise<void> {
    this.logger.info('omikuji()')

    await page.emulate(KnownDevices['iPhone 12 Pro'])

    await page.goto('https://www.pointtown.com/fortune/omikuji/drawing', {
      waitUntil: 'networkidle2',
    })
    await sleep(10_000)
  }

  async horoscope(page: Page): Promise<void> {
    this.logger.info('horoscope()')

    await page.emulate(KnownDevices['iPhone 12 Pro'])

    await page.goto('https://www.pointtown.com/fortune/horoscope/detail', {
      waitUntil: 'networkidle2',
    })
    await page
      .waitForSelector('button.horoscope-btn[type="submit"]')
      .then((element) => element?.click())
  }

  /**
   * スタンプラリー
   *
   * スタンプラリーは /game ページにあり、他の活動（easyGame, gesoten, pointQ 等）を
   * 完了することでスタンプが貯まります。このメソッドは進捗状況のログ出力を行います。
   *
   * 注意: スタンプは他のメソッド（easyGame, gesoten, pointQ など）の実行時に
   * 自動的に獲得されるため、このメソッドは主に進捗確認用です。
   *
   * @param page ページ
   */
  async stamprally(page: Page): Promise<void> {
    this.logger.info('stamprally()')

    await page.goto('https://www.pointtown.com/game#link-stamp-sec', {
      waitUntil: 'networkidle2',
    })

    // スタンプラリーの進捗を確認
    const stampSection = await page.$('#link-stamp-sec')
    if (stampSection === null) {
      this.logger.info('スタンプラリーセクションが見つかりません')
      return
    }

    // デイリーミッションの進捗を取得
    const progressSections = await page.$$('.c-game-progress-sec')
    for (const section of progressSections) {
      const reward = await section
        .$eval('.c-game-progress-sec__reward', (el) =>
          el.textContent ? el.textContent.trim().replaceAll(/\s+/g, ' ') : ''
        )
        .catch(() => '')
      const note = await section
        .$eval('.c-game-progress-sec__note', (el) =>
          el.textContent ? el.textContent.trim() : ''
        )
        .catch(() => '')
      if (reward || note) {
        this.logger.info(`スタンプラリー: ${reward} (${note})`)
      }
    }
  }

  /**
   * 脳トレクイズ
   *
   * gamebox.pointtown.com/quiz にリダイレクトされ、クイズに回答してスタンプを集める。
   * 12個スタンプを集めると抽選でコインが当たる。
   *
   * @param page ページ
   */
  async brainTraining(page: Page): Promise<void> {
    this.logger.info('brainTraining()')

    await page.goto('https://www.pointtown.com/quiz/redirect/brain-training', {
      waitUntil: 'networkidle2',
    })

    // 「つづきから」または「はじめる」ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'a[href*="/quiz/question"], button:has-text("つづきから"), button:has-text("はじめる")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(3000)
    }

    // クイズに回答（最大10問）
    for (let i = 0; i < 10; i++) {
      // 回答ボタンを探す
      const answerButtons = await page.$$(
        'button[class*="answer"], li[class*="choice"] button'
      )
      if (answerButtons.length === 0) {
        this.logger.info('回答ボタンが見つかりません。クイズ終了または未開始。')
        break
      }

      // ランダムに回答を選択
      const randomIndex = Math.floor(Math.random() * answerButtons.length)
      await answerButtons[randomIndex].click()
      await sleep(2000)

      // 次の問題へ進むボタンがあればクリック
      const nextButton = await page
        .$(
          'button:has-text("次へ"), button:has-text("次の問題"), a:has-text("次へ")'
        )
        .catch(() => null)
      if (nextButton) {
        await nextButton.click()
        await sleep(2000)
      }
    }

    await sleep(3000)
  }

  /**
   * 今夜はナゾトレ
   *
   * gamebox.pointtown.com/nazotore にリダイレクトされる。
   * 謎解きクイズに回答してスタンプを獲得する。
   *
   * @param page ページ
   */
  async nazotore(page: Page): Promise<void> {
    this.logger.info('nazotore()')

    await page.goto('https://www.pointtown.com/nazotore/redirect', {
      waitUntil: 'networkidle2',
    })

    // 開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("挑戦"), button:has-text("はじめる"), a:has-text("挑戦")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(3000)
    }

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // クイズに回答（回答ボタンがあれば）
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
   * まちがい探し
   *
   * gamebox.pointtown.com/spotdiff にリダイレクトされる。
   * 「挑戦する」→ 広告視聴 → ゲームプレイでルーペを獲得。
   * 100個ルーペを集めると抽選でコインが当たる。
   *
   * @param page ページ
   */
  async spotdiff(page: Page): Promise<void> {
    this.logger.info('spotdiff()')

    await page.goto('https://www.pointtown.com/game/redirect/spotdiff', {
      waitUntil: 'networkidle2',
    })

    // 「挑戦する」ボタンをクリック
    const challengeButton = await page
      .waitForSelector('button:has-text("挑戦する"), a:has-text("挑戦する")', {
        timeout: 5000,
      })
      .catch(() => null)

    if (challengeButton) {
      await challengeButton.click()
      await sleep(3000)
    }

    // 広告を再生して開始するボタンがあればクリック
    const adButton = await page
      .waitForSelector(
        'button:has-text("広告を再生"), button:has-text("広告を見て")',
        {
          timeout: 5000,
        }
      )
      .catch(() => null)

    if (adButton) {
      await adButton.click()
      this.logger.info('広告再生開始、30秒待機')
      await sleep(30_000) // 広告視聴待機

      // 広告終了後の閉じるボタン
      const closeButton = await page
        .waitForSelector(
          'button:has-text("閉じる"), button:has-text("スキップ"), button[class*="close"]',
          { timeout: 10_000 }
        )
        .catch(() => null)

      if (closeButton) {
        await closeButton.click()
        await sleep(2000)
      }
    }

    // ゲーム画面でスタンプ獲得（訪問だけでもスタンプが貯まる場合がある）
    await sleep(5000)
  }

  /**
   * クラッシュアイス（パズル）
   *
   * gamebox.pointtown.com/puzzle にリダイレクトされる。
   * パズルゲームをプレイしてスタンプを獲得する。
   *
   * @param page ページ
   */
  async puzzle(page: Page): Promise<void> {
    this.logger.info('puzzle()')

    await page.goto('https://www.pointtown.com/game/redirect/puzzle', {
      waitUntil: 'networkidle2',
    })

    // 開始ボタンをクリック
    const startButton = await page
      .waitForSelector(
        'button:has-text("挑戦"), button:has-text("はじめる"), button:has-text("スタート")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (startButton) {
      await startButton.click()
      await sleep(3000)
    }

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // ゲーム画面で待機（参加するだけでスタンプが貯まる）
    await sleep(10_000)
  }

  /**
   * たびろく（すごろく）
   *
   * gamebox.pointtown.com/sugoroku にリダイレクトされる。
   * すごろくゲームでサイコロを振ってスタンプを獲得する。
   *
   * @param page ページ
   */
  async sugoroku(page: Page): Promise<void> {
    this.logger.info('sugoroku()')

    await page.goto('https://www.pointtown.com/game/redirect/sugoroku', {
      waitUntil: 'networkidle2',
    })

    // 広告があれば視聴
    await this.watchAdIfExists(page)

    // サイコロを振るボタンをクリック
    const diceButton = await page
      .waitForSelector(
        'button:has-text("サイコロ"), button:has-text("振る"), button:has-text("スタート")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (diceButton) {
      await diceButton.click()
      await sleep(5000) // アニメーション待機
    }

    await sleep(5000)
  }

  /**
   * ふるふるパニック
   *
   * pointtown.dropgame.jp にリダイレクトされる。
   * 落ちものゲームをプレイしてポイントを獲得する。
   *
   * @param page ページ
   */
  async dropgame(page: Page): Promise<void> {
    this.logger.info('dropgame()')

    await page.goto(
      'https://www.pointtown.com/game/redirect/marketplace/dropgame',
      {
        waitUntil: 'networkidle2',
      }
    )

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
      await sleep(10_000) // ゲームプレイ待機
    }

    await sleep(5000)
  }

  /**
   * CMくじ
   *
   * pointtown.cmnw.jp にリダイレクトされる。
   * CM動画を視聴してくじを引き、ポイントを獲得する。
   *
   * @param page ページ
   */
  async cmkuji(page: Page): Promise<void> {
    this.logger.info('cmkuji()')

    await page.goto('https://www.pointtown.com/cmkuji/redirect', {
      waitUntil: 'networkidle2',
    })

    // くじを引くボタンをクリック
    const drawButton = await page
      .waitForSelector(
        'button:has-text("くじを引く"), button:has-text("動画を見る"), a:has-text("くじを引く")',
        { timeout: 5000 }
      )
      .catch(() => null)

    if (drawButton) {
      await drawButton.click()
      this.logger.info('CM動画再生開始、30秒待機')
      await sleep(30_000) // CM視聴待機

      // 動画終了後の閉じるボタン
      const closeButton = await page
        .waitForSelector(
          'button:has-text("閉じる"), button:has-text("結果を見る"), button[class*="close"]',
          { timeout: 10_000 }
        )
        .catch(() => null)

      if (closeButton) {
        await closeButton.click()
        await sleep(3000)
      }
    }

    await sleep(3000)
  }
}
