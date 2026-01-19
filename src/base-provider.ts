import { Logger } from '@book000/node-utils'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer, { Browser, Page } from 'rebrowser-puppeteer-core'
import { sendDiscordMessage } from './discord'
import { getConfig } from './configuration'
import { waitForCloudflareChallenge } from './functions'

/**
 * スクリーンショット設定
 */
interface ScreenshotConfig {
  /** スクリーンショットを有効にするか */
  enabled: boolean
  /** スクリーンショットの保存先ディレクトリ */
  directory: string
  /** スクリーンショットの保存期間（日数） */
  retentionDays: number
}

export interface Crawler {
  run(): Promise<void>
  loginOnly(): Promise<void>
}

export abstract class BaseCrawler implements Crawler {
  logger!: Logger
  protected screenshotConfig: ScreenshotConfig
  private screenshotCleanupDone = false

  constructor() {
    this.logger = Logger.configure(this.constructor.name)

    // NaN 検証を含むスクリーンショット設定
    const retentionDaysEnv = process.env.SCREENSHOT_RETENTION_DAYS
    let retentionDays = Number.parseInt(retentionDaysEnv ?? '7', 10)
    if (Number.isNaN(retentionDays)) {
      retentionDays = 7
    }

    this.screenshotConfig = {
      // デフォルトで有効（ENABLE_SCREENSHOT=false で無効化）
      enabled: process.env.ENABLE_SCREENSHOT !== 'false',
      // data フォルダの下に保存
      directory: process.env.SCREENSHOT_DIR ?? 'data/screenshots',
      retentionDays,
    }
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
        '--no-first-run',
        '--window-size=1920,1080',
        // Cloudflare 検出回避のための追加引数
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-infobars',
        // 言語・タイムゾーン設定
        '--lang=ja-JP',
        // WebGL を無効化（SwiftShader が Bot 検出される原因のため）
        '--disable-webgl',
        '--disable-webgl2',
        // 追加のフィンガープリント対策
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
      ],
      // automation 警告バーを非表示
      ignoreDefaultArgs: ['--enable-automation'],
    }

    return await puppeteer.launch(launchOptions)
  }

  private async initPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(120 * 1000)

    // User-Agent をブラウザのデフォルト値、もしくは環境変数から設定
    // HeadlessChrome を Chrome に置換して検出を回避
    const defaultUserAgent = await browser.userAgent()
    const cleanUserAgent = defaultUserAgent.replace('HeadlessChrome', 'Chrome')
    const userAgent = process.env.USER_AGENT ?? cleanUserAgent
    await page.setUserAgent(userAgent)

    // Cloudflare 検出回避のためのステルス処理
    await page.evaluateOnNewDocument(() => {
      // navigator.webdriver を隠蔽
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      })

      // Chrome オブジェクトを追加（Chrome ブラウザとして認識させる）
      // @ts-expect-error Chrome property
      globalThis.chrome = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {},
      }

      // プラグインを追加
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/pdf', suffixes: 'pdf', description: '' },
            name: 'Chrome PDF Viewer',
            filename: 'internal-pdf-viewer',
            length: 1,
          },
          {
            0: {
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format',
            },
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            length: 1,
          },
          {
            0: {
              type: 'application/x-nacl',
              suffixes: '',
              description: 'Native Client Executable',
            },
            name: 'Native Client',
            filename: 'internal-nacl-plugin',
            length: 1,
          },
        ],
        configurable: true,
      })

      // 言語設定
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ja', 'en-US', 'en'],
        configurable: true,
      })

      // 権限クエリの結果を偽装
      const originalQuery = globalThis.navigator.permissions.query.bind(
        globalThis.navigator.permissions
      )
      globalThis.navigator.permissions.query = (
        parameters: PermissionDescriptor
      ) =>
        parameters.name === 'notifications'
          ? Promise.resolve({
              state: Notification.permission,
              onchange: null,
            } as PermissionStatus)
          : originalQuery(parameters)

      // Canvas フィンガープリントにノイズを追加
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function (
        type?: string,
        quality?: number
      ) {
        const context = this.getContext('2d')
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height)
          const data = imageData.data
          // 微小なノイズを追加（検出を回避しつつ画像品質を維持）
          for (let i = 0; i < data.length; i += 4) {
            // RGB 値に ±1 の範囲でノイズを追加
            data[i] = Math.max(
              0,
              Math.min(255, data[i] + (Math.random() > 0.5 ? 1 : -1))
            )
          }
          context.putImageData(imageData, 0, 0)
        }
        return originalToDataURL.call(this, type, quality)
      }

      // ハードウェア情報のスプーフィング
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true,
      })

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true,
      })

      // 画面解像度のスプーフィング（一般的な値を使用）
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true,
      })

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true,
      })
    })

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

        // Cloudflare チャレンジを待機
        const loginCheckResult = await this.checkAlreadyLogin(page)
        await waitForCloudflareChallenge(page, this.logger)

        if (!loginCheckResult) {
          if (!isEnableLogin) {
            this.logger.info('Login is disabled')

            // スクリーンショットを撮影して Discord に添付
            const screenshotPath = await this.takeScreenshot(
              page,
              'need-login',
              'error'
            )
            await sendDiscordMessage(
              config,
              'Need login but login is disabled (main mode)',
              { isMention: true, screenshotPath: screenshotPath ?? undefined }
            )
            return
          }
          this.logger.info('is not login')
          await this.login(page)
          // ログイン後も Cloudflare チャレンジを待機
          await waitForCloudflareChallenge(page, this.logger)
        }
        await this.crawl(browser, page)
      } else {
        this.logger.info('Target mode')

        // Cloudflare チャレンジを待機
        const loginCheckResult = await this.checkAlreadyLogin(page)
        await waitForCloudflareChallenge(page, this.logger)

        if (!loginCheckResult) {
          if (!isEnableLogin) {
            this.logger.info('Login is disabled')

            // スクリーンショットを撮影して Discord に添付
            const screenshotPath = await this.takeScreenshot(
              page,
              'need-login',
              'error'
            )
            await sendDiscordMessage(
              config,
              'Need login but login is disabled (target mode)',
              { isMention: true, screenshotPath: screenshotPath ?? undefined }
            )
            return
          }
          this.logger.info('is not login')
          await this.login(page)
          // ログイン後も Cloudflare チャレンジを待機
          await waitForCloudflareChallenge(page, this.logger)
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
      // Cloudflare チャレンジを待機
      const loginCheckResult = await this.checkAlreadyLogin(page)
      await waitForCloudflareChallenge(page, this.logger)

      if (!loginCheckResult) {
        await this.login(page)
        // ログイン後も Cloudflare チャレンジを待機
        await waitForCloudflareChallenge(page, this.logger)
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
    const methodName = method.name || 'unknown'
    await page.bringToFront()
    try {
      await this.takeScreenshot(page, methodName, 'before')
      await method(page)
      await this.takeScreenshot(page, methodName, 'after')
    } catch (error) {
      await this.takeScreenshot(page, methodName, 'error')
      this.logger.error('Error', error as Error)
      throw error
    }
  }

  /**
   * スクリーンショットを撮影する
   *
   * @param page ページ
   * @param methodName メソッド名
   * @param timing タイミング（before/after/error）
   * @returns スクリーンショットのファイルパス（失敗時は null）
   */
  protected async takeScreenshot(
    page: Page,
    methodName: string,
    timing: 'before' | 'after' | 'error'
  ): Promise<string | null> {
    if (!this.screenshotConfig.enabled) {
      return null
    }

    try {
      // スクリーンショットディレクトリの作成
      const providerName = this.constructor.name.toLowerCase()
      const dateDir = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const screenshotDir = path.join(
        this.screenshotConfig.directory,
        providerName,
        dateDir
      )

      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true })
      }

      // ファイル名の生成（YYYYMMDD-HHmmss-SSS 形式）
      const timestamp = new Date()
        .toISOString()
        .replaceAll(/[:.TZ]/g, '-')
        .replaceAll(/-$/g, '')
      const filename = `${timestamp}_${methodName}_${timing}.png`
      const filepath = path.join(screenshotDir, filename)

      // スクリーンショット撮影
      await page.screenshot({ path: filepath, fullPage: true })
      this.logger.info(`Screenshot saved: ${filepath}`)

      // 古いスクリーンショットの削除（セッションごとに1回のみ実行）
      if (!this.screenshotCleanupDone) {
        this.screenshotCleanupDone = true
        // バックグラウンドで非同期実行
        this.cleanupOldScreenshots().catch((error: unknown) => {
          this.logger.warn(
            `Failed to cleanup old screenshots: ${(error as Error).message}`
          )
        })
      }

      return filepath
    } catch (error) {
      this.logger.warn(`Failed to take screenshot: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * 古いスクリーンショットを削除する（非同期）
   */
  private async cleanupOldScreenshots(): Promise<void> {
    const screenshotBaseDir = this.screenshotConfig.directory
    if (!fs.existsSync(screenshotBaseDir)) {
      return
    }

    const retentionDays = this.screenshotConfig.retentionDays
    const now = new Date()
    now.setHours(0, 0, 0, 0) // 今日の 00:00:00

    // プロバイダーディレクトリを走査
    const providers = await fs.promises.readdir(screenshotBaseDir)
    for (const provider of providers) {
      const providerDir = path.join(screenshotBaseDir, provider)
      const providerStat = await fs.promises.stat(providerDir)
      if (!providerStat.isDirectory()) {
        continue
      }

      // 日付ディレクトリを走査
      const dateDirs = await fs.promises.readdir(providerDir)
      for (const dateDir of dateDirs) {
        const dateDirPath = path.join(providerDir, dateDir)
        const dateDirStat = await fs.promises.stat(dateDirPath)
        if (!dateDirStat.isDirectory()) {
          continue
        }

        // 日付ディレクトリ名（YYYY-MM-DD）から日時を取得
        const dirDate = new Date(dateDir)
        dirDate.setHours(0, 0, 0, 0)
        if (Number.isNaN(dirDate.getTime())) {
          continue
        }

        // 日数で比較（retentionDays より古い場合は削除）
        const diffDays = Math.floor(
          (now.getTime() - dirDate.getTime()) / (24 * 60 * 60 * 1000)
        )
        if (diffDays > retentionDays) {
          await fs.promises.rm(dateDirPath, { recursive: true })
          this.logger.info(`Deleted old screenshots: ${dateDirPath}`)
        }
      }

      // 空のプロバイダーディレクトリを削除
      const remainingDirs = await fs.promises.readdir(providerDir)
      if (remainingDirs.length === 0) {
        await fs.promises.rmdir(providerDir)
      }
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
