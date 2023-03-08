import { BaseCrawler } from '@/base-provider'
import { getConfig } from '@/configuration'
import { getNewTabPage, isExistsSelector, sleep, waitForUrl } from '@/functions'
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

    // 一番最初にエントリー
    await this.entryLottery(page)

    await this.gesoten(page)
    await this.chirashi(page)
    await this.chinju(page)
    await this.quiz(page)
    await this.divination(page)
    await this.fishing(page)
    await this.choice(page)
    await this.news(page)
    await this.garapon(page)
    await this.doron(page)
    await this.ticketingLottery(page)
    await this.fund(page)
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
      (await page.evaluate((element) => element?.href, hintElement)) ??
      'about:blank'
    this.logger.info(`hint: ${hintUrl}`)
    const hintPage = await page.browser().newPage()
    await hintPage.goto(hintUrl, {
      waitUntil: 'networkidle2',
    })
    const hint =
      (await hintPage.$eval('body', (element) => element.textContent)) ?? ''
    await hintPage.close()

    const answers = await page.$$('ul.choices__list button')
    let isFoundAnswer = false
    for (const answer of answers) {
      const text = await page.evaluate(
        (element) => element?.textContent,
        answer
      )
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

    await page.goto('https://ecnavi.jp/mainichi_news/', {
      waitUntil: 'networkidle2',
    })
    const items = await page.$$(
      'li.article-latest-item a.article-latest-item__link'
    )
    for (const item of items.slice(0, 5)) {
      const url = await page.evaluate((element) => element?.href, item)
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
        .catch(() => {})
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
      .catch(() => {})
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
}
