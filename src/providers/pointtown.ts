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
import { Browser, Dialog, KnownDevices, Page } from 'rebrowser-puppeteer-core'

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

    // 新ゲーム
    await this.runMethod(page, this.brainTraining.bind(this))
    await this.runMethod(page, this.nazotore.bind(this))
    await this.runMethod(page, this.spotdiff.bind(this))
    await this.runMethod(page, this.puzzle.bind(this))
    await this.runMethod(page, this.sugoroku.bind(this))
    await this.runMethod(page, this.dropgame.bind(this))
    await this.runMethod(page, this.cmkuji.bind(this))
    await this.runMethod(page, this.movieDeCoin.bind(this))

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

      // 回答ボタンをクリックし、ページ遷移を待機
      await Promise.all([
        page
          .waitForSelector('button#js-pointq-submit', {
            visible: true,
            timeout: 10_000,
          })
          .then((element) => element?.click()),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ])

      // 結果ページの正解表示を待機（タイムアウトを 60 秒に設定）
      await page.waitForSelector('p.pointq-correct-answer', {
        timeout: 60_000,
      })
      const trueanswer = await page.evaluate(() => {
        const text =
          document.querySelector('p.pointq-correct-answer')?.textContent ?? ''
        const segments = text.split('：')
        return segments.length > 1 ? segments[1] : ''
      })
      this.logger.info(`trueanswer: ${trueanswer}`)
      json[question] = trueanswer
      fs.writeFileSync(`/data/pointq.json`, JSON.stringify(json))

      // 次の問題への遷移（タイムアウト時はページを直接リロード）
      if (await isExistsSelector(page, 'a[href="/pointq/input"]')) {
        try {
          await Promise.all([
            page
              .waitForSelector('a[href="/pointq/input"]')
              .then((element) => element?.click()),
            page.waitForNavigation({
              waitUntil: 'domcontentloaded',
              timeout: 30_000,
            }),
          ])
        } catch (error) {
          if ((error as Error).name === 'TimeoutError') {
            this.logger.warn(
              '次の問題への遷移がタイムアウト、ページを直接読み込み'
            )
            await page.goto('https://www.pointtown.com/pointq/input', {
              waitUntil: 'networkidle2',
            })
          } else {
            throw error
          }
        }
      } else if (await isExistsSelector(page, 'div.rewardResumebutton')) {
        try {
          await Promise.all([
            page
              .waitForSelector('div.rewardResumebutton')
              .then((element) => element?.click()),
            page.waitForNavigation({
              waitUntil: 'domcontentloaded',
              timeout: 30_000,
            }),
          ])
        } catch (error) {
          if ((error as Error).name === 'TimeoutError') {
            this.logger.warn(
              '次の問題への遷移がタイムアウト、ページを直接読み込み'
            )
            await page.goto('https://www.pointtown.com/pointq/input', {
              waitUntil: 'networkidle2',
            })
          } else {
            throw error
          }
        }
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
   * ポイントチャンス (アンケートページ下部)
   *
   * 注意: 2024年以降、この機能はサイトから削除された可能性があります。
   * 要素が見つからない場合は早期リターンします。
   *
   * @param page ページ
   */
  async pointChance(page: Page): Promise<void> {
    this.logger.info('pointChance()')
    await page.goto('https://www.pointtown.com/enquete#link-coin-chance', {
      waitUntil: 'networkidle2',
    })
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
   * 動画でコイン
   *
   * 動画広告を視聴してコインを獲得する。
   * 時間帯ごとに最大 3 回視聴可能（0時～8時、8時～16時、16時～24時）
   * 1回の視聴で 5 コイン獲得、最大 45 コイン/日。
   *
   * @param page ページ
   */
  async movieDeCoin(page: Page): Promise<void> {
    this.logger.info('movieDeCoin()')

    // ダイアログ（音声付き再生確認）を自動承認するハンドラー
    // eslint-disable-next-line unicorn/consistent-function-scoping -- this.logger を使用するためメソッド内に定義
    const dialogHandler = (dialog: Dialog) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      dialog.accept().then(() => {
        this.logger.info('動画再生確認ダイアログを承認')
      })
    }

    // ダイアログハンドラーをページ遷移前に登録
    page.on('dialog', dialogHandler)

    try {
      await page.goto('https://www.pointtown.com/movie-de-coin', {
        waitUntil: 'networkidle2',
      })

      // 残り回数を確認
      const remainingText = await page
        .$eval('.movie-point-time__title', (el) =>
          el.textContent ? el.textContent.trim() : ''
        )
        .catch(() => '')

      // 「あと、N回見れるよ」から残り回数を抽出
      const remainingMatch = /(\d+)回/.exec(remainingText)
      const remainingCount = remainingMatch
        ? Number.parseInt(remainingMatch[1], 10)
        : 0

      if (remainingCount === 0) {
        this.logger.info('この時間帯の動画視聴回数は上限に達しています')
        return
      }

      this.logger.info(`残り視聴可能回数: ${remainingCount}`)

      // 動画を視聴（残り回数分繰り返す）
      for (let i = 0; i < remainingCount; i++) {
        this.logger.info(`動画視聴 ${i + 1}/${remainingCount} 回目`)

        // 動画再生ボタンをクリック
        const playButton = await page
          .waitForSelector('button.js-ad-mov-trigger-btn', {
            visible: true,
            timeout: 10_000,
          })
          .catch(() => null)

        if (playButton === null) {
          this.logger.info('動画再生ボタンが見つかりません')
          break
        }

        await playButton.click()
        this.logger.info('動画再生ボタンをクリック、広告視聴待機中...')

        // 広告視聴完了を待機（最大 60 秒、再生ボタンが再表示されたら完了）
        const adMaxWaitMs = 60_000
        const adCheckIntervalMs = 1000
        const adStartTime = Date.now()
        let adCompleted = false

        while (Date.now() - adStartTime < adMaxWaitMs) {
          // 再生ボタンが再び表示されたら、広告視聴が完了したとみなす
          const adPlayButton = await page.$('button.js-ad-mov-trigger-btn')
          if (adPlayButton !== null) {
            const box = await adPlayButton.boundingBox()
            if (box !== null) {
              adCompleted = true
              break
            }
          }
          await sleep(adCheckIntervalMs)
        }

        if (adCompleted) {
          this.logger.info('広告視聴完了を検知しました')
        } else {
          this.logger.warn(
            '広告視聴完了を検知できなかったため、タイムアウトまで待機しました'
          )
        }

        // ページをリロードして次の動画を視聴
        await page.goto('https://www.pointtown.com/movie-de-coin', {
          waitUntil: 'networkidle2',
        })

        // 次のループの前に少し待機
        await sleep(3000)
      }

      this.logger.info('動画でコイン完了')
    } finally {
      // ダイアログハンドラーを削除
      page.off('dialog', dialogHandler)
    }
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
