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

    await this.runMethod(page, this.triangleLot.bind(this))
    await this.runMethod(page, this.pointQ.bind(this))
    await this.runMethod(page, this.mailCheck.bind(this))
    await this.runMethod(page, this.pointChance.bind(this))
    await this.runMethod(page, this.competition.bind(this))
    await this.runMethod(page, this.easyGame.bind(this))
    await this.runMethod(page, this.gesoten.bind(this))
    await this.runMethod(page, this.news.bind(this))

    // スマホ系
    const mobilePage = await browser.newPage()
    await this.runMethod(mobilePage, this.gacha.bind(this))
    await this.runMethod(mobilePage, this.omikuji.bind(this))
    await this.runMethod(mobilePage, this.horoscope.bind(this))
    await mobilePage.close()
    // await this.stamprally(page)

    const afterPoint = await this.getCurrentPoint(page)
    this.logger.info(`afterPoint: ${afterPoint}`)
    await finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.05)
  }

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info('checkAlreadyLogin()')
    await page.goto('https://www.pointtown.com/mypage', {
      waitUntil: 'networkidle2',
    })
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

    const nPointText = await page.$eval(
      'ul.c-mypage-summary-sec__main a[href="/mypage/point-history"]',
      (element) => element.textContent
    )
    if (nPointText == null) {
      return -1
    }
    return Number.parseInt(nPointText, 10)
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
      const trueanswer = await page.evaluate(
        () =>
          document
            .querySelector('p.pointq-correct-answer')
            ?.textContent?.split('：')[1] ?? ''
      )
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
   * @param page ページ
   */
  async pointChance(page: Page): Promise<void> {
    this.logger.info('pointchance()')
    await page.goto(
      'https://www.pointtown.com/monitor/fancrew/real-shop#link-coin-chance',
      { waitUntil: 'networkidle2' }
    )
    const notObtainedElement = await page.$(
      'div.c-coin-chance-sec__status p.c-coin-label'
    )
    if (notObtainedElement == null) {
      this.logger.info('notObtainedElement not found.')
      return
    }
    const notObtained = await page.evaluate(
      (element) => element.textContent,
      notObtainedElement
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

    await page
      .waitForSelector('button.btn-receive')
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
    return await page
      .waitForSelector('header.c-sec__l-header p.c-coin-label')
      .then(async (element) => {
        const coin = await page.evaluate(
          (element) => element?.textContent,
          element
        )
        return Number(coin?.replace(/,/g, ''))
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

  async stamprally(page: Page): Promise<void> {
    this.logger.info('stamprally()')

    await page.goto('https://www.pointtown.com/ptu/mypage/top', {
      waitUntil: 'networkidle2',
    })
    try {
      await page
        .waitForSelector('a.stamp-cl-btn', {
          visible: true,
          timeout: 10_000,
        })
        .then((element) => element?.click())
    } catch (error) {
      /*
       */
      // タイムアウトの場合は次の処理へ進む
      this.logger.info((error as Error).message)
    }
  }
}
