import { Logger } from '@book000/node-utils'
import fs from 'node:fs'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import { sendDiscordMessage } from './discord'
import { getConfig } from './configuration'

export interface Crawler {
  run(): Promise<void>
  loginOnly(): Promise<void>
}

export abstract class BaseCrawler implements Crawler {
  logger!: Logger

  constructor() {
    this.logger = Logger.configure(this.constructor.name)
  }

  private async initBrowser(): Promise<Browser> {
    const userDataBaseDirectory = process.env.USER_DATA_BASE ?? 'userdata'
    if (!fs.existsSync(userDataBaseDirectory)) {
      fs.mkdirSync(userDataBaseDirectory)
    }
    const userDataDirectory = `${userDataBaseDirectory}/${this.constructor.name.toLowerCase()}`

    const launchOptions = {
      headless: false,
      executablePath: process.env.CHROMIUM_PATH,
      userDataDir: userDataDirectory,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    }

    return await puppeteer.launch(launchOptions)
  }

  private async initPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(120 * 1000)

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', () => null)
      // @ts-expect-error navigator.__proto__ is not defined
      // eslint-disable-next-line no-proto, @typescript-eslint/no-unsafe-member-access
      delete navigator.__proto__.webdriver
    })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
    )

    return page
  }

  /**
   * クローリングを実施する
   * @param method 実行対象のメソッド
   */
  async run(method: any = null): Promise<void> {
    const browser = await this.initBrowser()
    const page = await this.initPage(browser)

    const config = getConfig()

    const isEnableLogin = process.env.ENABLE_LOGIN === 'true'
    try {
      if (method === null) {
        this.logger.info('Main mode')

        if (!(await this.checkAlreadyLogin(page))) {
          if (!isEnableLogin) {
            this.logger.info('Login is disabled')

            await sendDiscordMessage(
              config,
              'Need login but login is disabled (main mode)',
              undefined,
              true
            )
            return
          }
          this.logger.info('is not login')
          await this.login(page)
        }
        await this.crawl(browser, page)
      } else {
        this.logger.info('Target mode')
        if (!(await this.checkAlreadyLogin(page))) {
          if (!isEnableLogin) {
            this.logger.info('Login is disabled')

            await sendDiscordMessage(
              config,
              'Need login but login is disabled (target mode)',
              undefined,
              true
            )
            return
          }
          this.logger.info('is not login')
          await this.login(page)
        }
        await Reflect.apply(method, this, [page])
      }
    } catch (error) {
      this.logger.error('Error', error as Error)
    }
    this.logger.info('close browser')
    await browser.close()
  }

  public async loginOnly(): Promise<void> {
    const browser = await this.initBrowser()
    const page = await this.initPage(browser)

    try {
      if (!(await this.checkAlreadyLogin(page))) {
        await this.login(page)
      }
    } catch (error) {
      this.logger.error('Error', error as Error)
    }
    this.logger.info('close browser')
    await browser.close()
  }

  public async runMethod(
    page: Page,
    method: (page: Page) => Promise<void>
  ): Promise<void> {
    await page.bringToFront()
    try {
      await method(page)
    } catch (error) {
      this.logger.error('Error', error as Error)
    }
  }

  /**
   * クローリングメインプログラム
   * @param browser ブラウザー
   * @param page ページ
   */
  protected abstract crawl(browser: Browser, page: Page): Promise<void>

  /**
   * ログインしている状態かを確認する
   * @param page ページ
   * @returns ログインしているか
   */
  protected abstract checkAlreadyLogin(page: Page): Promise<boolean>

  /**
   * ログインする
   *
   * @param page ページ
   */
  protected abstract login(page: Page): Promise<void>
}
