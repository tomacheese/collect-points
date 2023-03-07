import { Logger } from '@book000/node-utils'
import fs from 'node:fs'
import puppeteer, { Browser, Page } from 'puppeteer-core'

export interface Crawler {
  run(): Promise<void>
}

export abstract class BaseCrawler implements Crawler {
  logger!: Logger

  constructor() {
    this.logger = Logger.configure(this.constructor.name)
  }

  /**
   * クローリングを実施する
   * @param method 実行対象のメソッド
   */
  async run(method: any = null): Promise<void> {
    const userDataBaseDirectory = process.env.USER_DATA_BASE || 'userdata'
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

    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(120 * 1000)

    await page.evaluateOnNewDocument(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      Object.defineProperty(navigator, 'webdriver', () => {})
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line no-proto
      delete navigator.__proto__.webdriver
    })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
    )

    const isEnableLogin = process.env.ENABLE_LOGIN === 'true'
    if (method === null) {
      this.logger.info('Main mode')

      if (!(await this.checkAlreadyLogin(page))) {
        if (!isEnableLogin) {
          this.logger.info('Login is disabled')
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
          return
        }
        this.logger.info('is not login')
        await this.login(page)
      }
      await Reflect.apply(method, this, [page])
    }
    this.logger.info('close browser')
    await browser.close()
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
