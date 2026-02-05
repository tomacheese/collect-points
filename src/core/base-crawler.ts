import { Logger } from '@book000/node-utils'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer, { Browser, Page } from 'rebrowser-puppeteer-core'
import { sendDiscordMessage } from './discord'
import { getConfig } from './configuration'
import {
  isExistsSelector,
  sleep,
  waitForCloudflareChallenge,
} from '@/utils/functions'

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

/**
 * クローラーのインターフェース
 */
export interface Crawler {
  run(): Promise<void>
  loginOnly(): Promise<void>
}

/**
 * ポイントログ設定
 */
interface PointLogConfig {
  /** 各機能のポイントログを有効にするか */
  enabled: boolean
}

/**
 * クローラーの基底クラス
 */
export abstract class BaseCrawler implements Crawler {
  logger!: Logger
  protected screenshotConfig: ScreenshotConfig
  protected pointLogConfig: PointLogConfig
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

    // ポイントログ設定（デフォルトで有効、ENABLE_POINT_LOG=false で無効化）
    this.pointLogConfig = {
      enabled: process.env.ENABLE_POINT_LOG !== 'false',
    }

    // スクリーンショット設定をログ出力
    this.logger.info(
      `Screenshot config: enabled=${this.screenshotConfig.enabled}, ` +
        `directory=${this.screenshotConfig.directory}, ` +
        `retentionDays=${this.screenshotConfig.retentionDays}`
    )

    // ポイントログ設定をログ出力
    this.logger.info(`PointLog config: enabled=${this.pointLogConfig.enabled}`)

    // スクリーンショットが有効な場合、ベースディレクトリを事前に作成
    if (this.screenshotConfig.enabled) {
      this.initScreenshotDirectory()
    }
  }

  /**
   * スクリーンショットのベースディレクトリを初期化する
   */
  private initScreenshotDirectory(): void {
    const baseDir = this.screenshotConfig.directory
    try {
      if (fs.existsSync(baseDir)) {
        // ディレクトリが存在する場合、書き込み権限を確認
        fs.accessSync(baseDir, fs.constants.W_OK)
        this.logger.info(`Screenshot base directory exists: ${baseDir}`)
      } else {
        fs.mkdirSync(baseDir, { recursive: true })
        this.logger.info(`Screenshot base directory created: ${baseDir}`)
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize screenshot directory: ${baseDir}`,
        error as Error
      )
      // ディレクトリ作成に失敗した場合、スクリーンショットを無効化
      this.screenshotConfig.enabled = false
      this.logger.warn('Screenshot feature disabled due to directory error')
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
      // CDP プロトコルタイムアウトを 2 分に設定（デフォルト 180 秒）
      // 広告ポップアップによるフリーズ時に早期検出するため短縮（Issue #414）
      protocolTimeout: 120_000,
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
          this.logger.info(
            `Login check failed. Current URL: ${page.url()}, isEnableLogin: ${isEnableLogin}`
          )

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
              `[${this.constructor.name}] Need login but login is disabled (main mode)`,
              { isMention: true, screenshotPath }
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
          this.logger.info(
            `Login check failed. Current URL: ${page.url()}, isEnableLogin: ${isEnableLogin}`
          )

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
              `[${this.constructor.name}] Need login but login is disabled (target mode)`,
              { isMention: true, screenshotPath }
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

  /**
   * ログインのみを実行する
   */
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

  /**
   * メソッドを実行する（エラーハンドリング・スクリーンショット・ポイントログ付き）
   *
   * メソッド実行前後で広告ポップアップ（Google Rewarded Ads）をチェックし、
   * 表示されていれば処理する。また、メソッド実行中も定期的に広告を監視する。
   *
   * ProtocolError（CDP タイムアウト）が発生した場合は、広告ポップアップの
   * チェック後にページをリロードして次のメソッド実行に備える（Issue #407, #414）。
   *
   * @param page ページ
   * @param method 実行するメソッド
   * @param methodName メソッド名（スクリーンショットのファイル名に使用）
   */
  public async runMethod(
    page: Page,
    method: (page: Page) => Promise<void>,
    methodName?: string
  ): Promise<void> {
    const name = methodName ?? (method.name || 'unknown')
    await page.bringToFront()

    // メソッド実行前に広告ポップアップをチェック（エラーは無視）
    try {
      await this.handleRewardedAd(page)
    } catch (error) {
      this.logger.warn(
        `${name}: handleRewardedAd (before) failed`,
        error as Error
      )
    }

    // メソッド実行中の広告監視を開始
    const stopMonitoring = this.setupAdMonitoring(page)

    // ポイントログが有効な場合、実行前のポイントを取得
    let beforePoint: number | null = null
    if (this.pointLogConfig.enabled) {
      try {
        beforePoint = await this.getCurrentPoint(page)
      } catch {
        // ポイント取得に失敗してもメソッド実行は継続
        this.logger.warn(`${name}: ポイント取得に失敗しました（実行前）`)
      }
    }

    try {
      await this.takeScreenshot(page, name, 'before')
      await method(page)
      await this.takeScreenshot(page, name, 'after')

      // ポイントログが有効な場合、実行後のポイントを取得して差分をログ出力
      if (this.pointLogConfig.enabled) {
        try {
          const afterPoint = await this.getCurrentPoint(page)
          this.logPointChange(name, beforePoint, afterPoint)
        } catch {
          this.logger.warn(`${name}: ポイント取得に失敗しました（実行後）`)
        }
      }
    } catch (error) {
      await this.takeScreenshot(page, name, 'error')
      this.logger.error('Error', error as Error)

      // ProtocolError（CDP タイムアウト）の場合は、広告チェック後にリロードして復帰を試みる
      // 広告ポップアップが表示された状態でブラウザがフリーズするケースへの対策（Issue #407, #414）
      if ((error as Error).name === 'ProtocolError') {
        this.logger.warn(
          `${name}: ProtocolError が発生したため、広告チェック後にページをリロードして復帰を試みます`
        )
        // ProtocolError 後に広告ポップアップを処理（フリーズの原因になった可能性がある）
        try {
          await this.handleRewardedAd(page)
        } catch {
          // 広告処理に失敗しても続行
        }
        try {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 })
          this.logger.info(`${name}: ページのリロードに成功しました`)
        } catch (reloadError) {
          this.logger.warn(
            `${name}: ページのリロードに失敗しました: ${(reloadError as Error).message}`
          )
        }
        // ProtocolError の場合は throw せず、次のメソッド実行に進む
        return
      }

      throw error
    } finally {
      // 広告監視を停止
      stopMonitoring()

      // メソッド実行後に広告ポップアップをチェック（エラーは無視）
      try {
        await this.handleRewardedAd(page)
      } catch (error) {
        this.logger.warn(
          `${name}: handleRewardedAd (after) failed`,
          error as Error
        )
      }
    }
  }

  /**
   * ポイント変動をログ出力する
   * @param methodName メソッド名
   * @param beforePoint 実行前のポイント
   * @param afterPoint 実行後のポイント
   */
  private logPointChange(
    methodName: string,
    beforePoint: number | null,
    afterPoint: number | null
  ): void {
    if (beforePoint === null || afterPoint === null) {
      this.logger.info(
        `📊 [${methodName}] ポイント変動: 取得失敗（before=${beforePoint}, after=${afterPoint}）`
      )
      return
    }

    if (beforePoint === -1 || afterPoint === -1) {
      this.logger.info(
        `📊 [${methodName}] ポイント変動: 取得失敗（before=${beforePoint}, after=${afterPoint}）`
      )
      return
    }

    const diff = afterPoint - beforePoint
    const sign = diff >= 0 ? '+' : ''
    this.logger.info(
      `📊 [${methodName}] ポイント変動: ${beforePoint.toLocaleString()} → ${afterPoint.toLocaleString()} (${sign}${diff.toLocaleString()})`
    )
  }

  /**
   * Google Rewarded Ads（広告ポップアップ）に対応する
   *
   * 「短い広告を見る」ボタンが表示されている場合、クリックして広告を視聴し、
   * ポップアップが閉じるまで待機する。広告ポップアップが表示された状態で
   * Puppeteer 操作を行うと CDP 接続がタイムアウトしてフリーズするため、
   * メソッド実行前後でこのメソッドを呼び出す（Issue #407, #414）。
   *
   * サブクラスでオーバーライド可能（例: ECNavi では URL ハッシュ除去が必要）。
   *
   * @param page ページ
   */
  protected async handleRewardedAd(page: Page): Promise<void> {
    // 広告ポップアップのボタンを 3 秒間待機
    const rewardedAdButton = await page
      .waitForSelector('button.fc-rewarded-ad-button', { timeout: 3000 })
      .catch(() => null)

    if (!rewardedAdButton) {
      return
    }

    this.logger.info('広告ポップアップを検出')

    // 「広告を見る」ボタンを JavaScript で直接クリック
    // Puppeteer の click() は要素の配置により失敗することがある
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
    let loopCount = 0

    while (Date.now() - startTime < maxWaitTime) {
      loopCount++

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

      // 10 回ごとに進捗ログを出力
      if (loopCount % 10 === 0) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
        this.logger.info(`広告視聴待機中... ${elapsedSeconds}秒経過`)
      }

      await sleep(1000)
    }

    await sleep(2000)
  }

  /**
   * 広告ポップアップの定期監視を設定する
   *
   * ページ上の DOM 変更を MutationObserver で監視し、広告ポップアップが
   * 検出された場合にフラグを立てる。定期的にフラグをチェックし、
   * 広告が検出された場合は handleRewardedAd() で処理する。
   *
   * メソッド実行中に表示される広告ポップアップに proactive に対応するための
   * 仕組み（Issue #414）。
   *
   * @param page ページ
   * @returns 監視停止用のクリーンアップ関数
   */
  protected setupAdMonitoring(page: Page): () => void {
    let stopped = false

    // 5 秒ごとに広告ポップアップをチェック
    const checkAd = async () => {
      try {
        const adDetected = await isExistsSelector(
          page,
          'button.fc-rewarded-ad-button'
        )
        if (adDetected) {
          this.logger.info('広告監視: 広告ポップアップを検出、処理を開始します')
          await this.handleRewardedAd(page)
        }
      } catch {
        // ページが閉じられた場合など、エラーは無視
      }
    }

    const intervalId = setInterval(() => {
      if (stopped) return
      // 非同期処理をバックグラウンドで実行（エラーは checkAd 内で処理済み）
      checkAd().catch(() => null)
    }, 5000)

    // ページが閉じられたら監視を停止
    const onClose = () => {
      stopped = true
      clearInterval(intervalId)
    }
    page.on('close', onClose)

    // クリーンアップ関数を返す
    return () => {
      stopped = true
      clearInterval(intervalId)
      page.off('close', onClose)
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
        this.logger.info(`Screenshot directory created: ${screenshotDir}`)
      }

      // ファイル名の生成（YYYYMMDD-HHmmss-SSS 形式）
      const timestamp = new Date()
        .toISOString()
        .replaceAll(/[:.TZ]/g, '-')
        .replaceAll(/-$/g, '')
      const filename = `${timestamp}_${methodName}_${timing}.png`
      const filepath = path.join(screenshotDir, filename)

      // スクリーンショット撮影前にビューポートサイズを確認
      const viewport = page.viewport()
      if (!viewport || viewport.width === 0 || viewport.height === 0) {
        this.logger.warn(
          `Invalid viewport for screenshot: ${JSON.stringify(viewport)}`
        )
        return null
      }

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

  /**
   * 現在のポイントを取得する
   *
   * runMethod() でポイント変動をログ出力するために使用される。
   * 各クローラーで実装する必要がある。
   *
   * @param page ページ
   * @returns ポイント数（取得できない場合は -1）
   */
  protected abstract getCurrentPoint(page: Page): Promise<number>
}
