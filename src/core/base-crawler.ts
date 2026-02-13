import { Logger } from '@book000/node-utils'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import puppeteer, { Browser, Page } from 'rebrowser-puppeteer-core'
import { sendDiscordMessage } from './discord'
import { getConfig } from './configuration'
import {
  isExistsSelector,
  sleep,
  waitForCloudflareChallenge,
} from '@/utils/functions'

const gzip = promisify(zlib.gzip)

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
 * 診断情報設定
 */
interface DiagnosticsConfig {
  /** 診断情報を有効にするか */
  enabled: boolean
  /** 診断情報の保存先ディレクトリ */
  directory: string
  /** 診断情報の保存期間（日数） */
  retentionDays: number
}

/**
 * Console log
 */
interface ConsoleLog {
  /** ログの種類 */
  type: string
  /** ログのテキスト */
  text: string
  /** ログの場所 */
  location?: string
  /** ページ URL */
  pageUrl: string
}

/**
 * Network log
 */
interface NetworkLog {
  /** リクエスト URL */
  url: string
  /** HTTP メソッド */
  method: string
  /** HTTP ステータスコード */
  status: number
  /** HTTP ステータステキスト */
  statusText: string
  /** タイミング情報 */
  timing: {
    start: number
    end: number
    duration: number
  }
  /** リクエストヘッダー */
  requestHeaders: Record<string, string>
  /** レスポンスヘッダー */
  responseHeaders: Record<string, string>
  /** リクエストが失敗したか */
  failed?: boolean
  /** エラーテキスト */
  errorText?: string
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
  protected diagnosticsConfig: DiagnosticsConfig
  protected gamesFilter?: string[]
  private fileCleanupDone = false
  private consoleLogs = new WeakMap<Page, ConsoleLog[]>()
  private networkLogs = new WeakMap<Page, NetworkLog[]>()

  constructor(gamesFilter?: string[]) {
    this.logger = Logger.configure(this.constructor.name)
    this.gamesFilter = gamesFilter

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

    // 診断情報設定（デフォルトで有効、ENABLE_DIAGNOSTICS=false で無効化）
    this.diagnosticsConfig = {
      enabled: process.env.ENABLE_DIAGNOSTICS !== 'false',
      directory: process.env.DIAGNOSTICS_DIR ?? 'data/diagnostics',
      retentionDays, // スクリーンショットと同じ保持期間
    }

    // スクリーンショット設定をログ出力
    this.logger.info(
      `Screenshot config: enabled=${this.screenshotConfig.enabled}, ` +
        `directory=${this.screenshotConfig.directory}, ` +
        `retentionDays=${this.screenshotConfig.retentionDays}`
    )

    // ポイントログ設定をログ出力
    this.logger.info(`PointLog config: enabled=${this.pointLogConfig.enabled}`)

    // 診断情報設定をログ出力
    this.logger.info(
      `Diagnostics config: enabled=${this.diagnosticsConfig.enabled}, ` +
        `directory=${this.diagnosticsConfig.directory}, ` +
        `retentionDays=${this.diagnosticsConfig.retentionDays}`
    )

    // スクリーンショットが有効な場合、ベースディレクトリを事前に作成
    if (this.screenshotConfig.enabled) {
      this.initScreenshotDirectory()
    }

    // 診断情報が有効な場合、ベースディレクトリを事前に作成
    if (this.diagnosticsConfig.enabled) {
      this.initDiagnosticsDirectory()
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

  /**
   * 診断情報のベースディレクトリを初期化する
   */
  private initDiagnosticsDirectory(): void {
    const baseDir = this.diagnosticsConfig.directory
    try {
      if (fs.existsSync(baseDir)) {
        // ディレクトリが存在する場合、書き込み権限を確認
        fs.accessSync(baseDir, fs.constants.W_OK)
        this.logger.info(`Diagnostics base directory exists: ${baseDir}`)
      } else {
        fs.mkdirSync(baseDir, { recursive: true })
        this.logger.info(`Diagnostics base directory created: ${baseDir}`)
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize diagnostics directory: ${baseDir}`,
        error as Error
      )
      // ディレクトリ作成に失敗した場合、診断情報を無効化
      this.diagnosticsConfig.enabled = false
      this.logger.warn('Diagnostics feature disabled due to directory error')
    }
  }

  /**
   * ページの診断情報収集を設定する
   * Console logs と Network logs を収集するリスナーと、JavaScript dialog を自動的に閉じるハンドラを設定
   * @param page 対象ページ
   */
  private setupPageDiagnostics(page: Page): void {
    // 診断情報が無効の場合は何もしない
    if (!this.diagnosticsConfig.enabled) {
      return
    }

    // 既に設定済みの場合は何もしない（重複呼び出しを防ぐ）
    if (this.consoleLogs.has(page)) {
      return
    }

    // Console logs の収集を初期化
    this.consoleLogs.set(page, [])

    // Network logs の収集を初期化
    this.networkLogs.set(page, [])

    // JavaScript dialog (alert/confirm/prompt) を自動的に閉じる
    page.on('dialog', (dialog) => {
      this.logger.warn(
        `JavaScript dialog を検出しました: ${dialog.type()} - ${dialog.message()}`
      )
      dialog
        .dismiss()
        .then(() => {
          this.logger.info('Dialog を自動的に閉じました')
        })
        .catch((error: unknown) => {
          this.logger.error(
            'Dialog を閉じる際にエラーが発生しました',
            error as Error
          )
        })
    })

    // Console logs の収集
    page.on('console', (msg) => {
      const logs = this.consoleLogs.get(page) ?? []

      // リングバッファ方式で最大 500 行まで保持
      if (logs.length >= 500) {
        logs.shift()
      }

      const location = msg.location()
      const log: ConsoleLog = {
        type: msg.type(),
        text: msg.text().slice(0, 2000), // 最大 2,000 文字
        location: `${location.url}:${location.lineNumber}:${location.columnNumber ?? 0}`,
        pageUrl: this.sanitizeUrl(page.url()),
      }

      logs.push(log)
      this.consoleLogs.set(page, logs)
    })

    // Network logs の収集
    page.on('response', (response) => {
      const logs = this.networkLogs.get(page) ?? []

      // リングバッファ方式で最大 200 リクエストまで保持
      if (logs.length >= 200) {
        logs.shift()
      }

      const request = response.request()
      const timing = response.timing()

      const log: NetworkLog = {
        url: this.sanitizeUrl(response.url()),
        method: request.method(),
        status: response.status(),
        statusText: response.statusText(),
        timing: {
          start: timing ? timing.requestTime * 1000 : Date.now(),
          end: timing
            ? (timing.requestTime + timing.receiveHeadersEnd / 1000) * 1000
            : Date.now(),
          duration: timing ? timing.receiveHeadersEnd : 0,
        },
        requestHeaders: request.headers(),
        responseHeaders: response.headers(),
        failed: !response.ok(),
      }

      // エラーテキストを取得（失敗した場合のみ）
      if (log.failed) {
        try {
          const failure = response.request().failure()
          if (failure) {
            log.errorText = failure.errorText
          }
        } catch {
          // エラーテキスト取得に失敗しても無視
        }
      }

      logs.push(log)
      this.networkLogs.set(page, logs)
    })

    // ページが閉じられたらログをクリア
    page.on('close', () => {
      this.consoleLogs.delete(page)
      this.networkLogs.delete(page)
    })
  }

  /**
   * URL をサニタイズする（クエリパラメータとフラグメントを除去）
   * @param url サニタイズ対象の URL
   * @returns サニタイズされた URL
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObject = new URL(url)
      return `${urlObject.origin}${urlObject.pathname}`
    } catch {
      return url
    }
  }

  /**
   * localStorage/sessionStorage をサニタイズする
   * トークン、パスワード、メールアドレスなどのキーを [REDACTED] に置き換え
   * @param storage サニタイズ対象のストレージ
   * @returns サニタイズされたストレージ
   */
  private sanitizeStorage(
    storage: Record<string, string>
  ): Record<string, string> {
    const sensitiveKeys = [
      'token',
      'password',
      'email',
      'session',
      'auth',
      'secret',
      'key',
    ]
    const sanitized: Record<string, string> = {}

    for (const [key, value] of Object.entries(storage)) {
      // キーに機密情報が含まれているかチェック（大文字小文字を区別しない部分一致）
      const isSensitive = sensitiveKeys.some((sensitiveKey) =>
        key.toLowerCase().includes(sensitiveKey)
      )
      sanitized[key] = isSensitive ? '[REDACTED]' : value
    }

    return sanitized
  }

  /**
   * HTTP ヘッダーをサニタイズする
   * Authorization, Cookie, Set-Cookie を [REDACTED] に置き換え
   * @param headers サニタイズ対象のヘッダー
   * @returns サニタイズされたヘッダー
   */
  private sanitizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const sanitized: Record<string, string> = { ...headers }
    const sensitiveHeaders = new Set(['authorization', 'cookie', 'set-cookie'])

    for (const header of Object.keys(sanitized)) {
      if (sensitiveHeaders.has(header.toLowerCase())) {
        sanitized[header] = '[REDACTED]'
      }
    }

    return sanitized
  }

  /**
   * 診断情報を保存する
   * エラー発生時に詳細な診断情報を JSON.gz 形式で保存
   * @param browser ブラウザ
   * @param page メインページ
   * @param methodName メソッド名
   * @param error エラー
   * @param executionTime 実行時間（ミリ秒）
   */
  private async saveDiagnostics(
    browser: Browser,
    page: Page,
    methodName: string,
    error: Error,
    executionTime: number
  ): Promise<void> {
    // 診断情報が無効の場合は何もしない
    if (!this.diagnosticsConfig.enabled) {
      return
    }

    try {
      // ページが閉じている場合は部分的な診断情報のみ保存
      const isPageClosed = page.isClosed()

      // タイムスタンプ生成
      const timestamp = new Date()

      // メインページ情報を取得（ページが閉じていない場合のみ）
      let mainPageInfo: any = null
      if (!isPageClosed) {
        mainPageInfo = await this.collectPageInfo(page)
      }

      // 他のページ情報を取得
      const otherPagesInfo = await this.collectOtherPagesInfo(browser, page)

      // すべてのタブのスクリーンショットを保存
      await this.saveAllTabsScreenshots(browser, methodName, timestamp)

      // すべてのタブから Console logs を取得
      const allConsoleLogs: ConsoleLog[] = []
      const allPages = await browser.pages()
      for (const p of allPages) {
        const logs = this.consoleLogs.get(p) ?? []
        allConsoleLogs.push(...logs)
      }

      // すべてのタブから Network logs を取得（サニタイズ）
      const allNetworkLogs: NetworkLog[] = []
      for (const p of allPages) {
        const logs = this.networkLogs.get(p) ?? []
        const sanitizedLogs = logs.map((log) => ({
          ...log,
          requestHeaders: this.sanitizeHeaders(log.requestHeaders),
          responseHeaders: this.sanitizeHeaders(log.responseHeaders),
        }))
        allNetworkLogs.push(...sanitizedLogs)
      }

      // 診断情報 JSON を構築
      const diagnosticInfo = {
        timestamp: timestamp.toISOString(),
        methodName,
        executionTime,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack ?? '',
        },
        mainPage: mainPageInfo,
        otherPages: otherPagesInfo,
        console: allConsoleLogs,
        network: allNetworkLogs,
      }

      // JSON を文字列化
      const jsonString = JSON.stringify(diagnosticInfo, null, 2)

      // gzip 圧縮
      const compressed = await gzip(jsonString)

      // ファイルに保存
      const providerName = this.constructor.name.toLowerCase()
      const dateDir = timestamp.toISOString().split('T')[0] // YYYY-MM-DD
      const diagnosticsDir = path.join(
        this.diagnosticsConfig.directory,
        providerName,
        dateDir
      )

      if (!fs.existsSync(diagnosticsDir)) {
        fs.mkdirSync(diagnosticsDir, { recursive: true })
      }

      const timestampStr = timestamp
        .toISOString()
        .replaceAll(/[:.TZ]/g, '-')
        .replaceAll(/-$/g, '')
      const filename = `${timestampStr}_${methodName}_error.json.gz`
      const filepath = path.join(diagnosticsDir, filename)

      fs.writeFileSync(filepath, compressed)

      this.logger.info(`Saved diagnostics: ${filepath}`)
    } catch (diagnosticError) {
      // 診断情報の保存に失敗しても、元のエラーを妨げない
      this.logger.error('Failed to save diagnostics', diagnosticError as Error)
    }
  }

  /**
   * 診断情報を保存する（getCurrentPoint などのヘルパーメソッド用）
   *
   * @param page - ページオブジェクト
   * @param methodName - メソッド名
   * @param error - エラーオブジェクト
   * @param executionTime - 実行時間（ミリ秒）。デフォルトは 0
   */
  protected async saveDiagnosticsIfEnabled(
    page: Page,
    methodName: string,
    error: Error,
    executionTime = 0
  ): Promise<void> {
    if (!this.diagnosticsConfig.enabled) {
      return
    }
    try {
      const browser = page.browser()
      await this.saveDiagnostics(
        browser,
        page,
        methodName,
        error,
        executionTime
      )
    } catch (diagnosticError) {
      this.logger.warn(
        `${methodName}: Failed to save diagnostics`,
        diagnosticError as Error
      )
    }
  }

  /**
   * ページ情報を収集する
   * @param page 対象ページ
   * @returns ページ情報
   */
  private async collectPageInfo(page: Page): Promise<any> {
    try {
      const [url, title, htmlSize, userAgent, localStorage, sessionStorage] =
        await Promise.all([
          Promise.resolve(page.url()),
          page.title().catch(() => ''),
          page
            .evaluate(() => document.documentElement.outerHTML.length)
            .catch(() => -1),
          page.evaluate(() => navigator.userAgent).catch(() => ''),
          page
            .evaluate(() =>
              Object.fromEntries(Object.entries(globalThis.localStorage))
            )
            .catch(() => ({})),
          page
            .evaluate(() =>
              Object.fromEntries(Object.entries(globalThis.sessionStorage))
            )
            .catch(() => ({})),
        ])

      // Cookie 数を取得（Page から取得）
      // NOTE: page.cookies() は deprecated だが、BrowserContext.cookies() への移行は
      // Puppeteer のバージョンに依存するため、現時点では page.cookies() を使用
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const cookies = await page.cookies().catch(() => [])

      // HTML ダンプを取得（タイムアウト 10 秒）
      const htmlDump = await Promise.race<string>([
        page.content(),
        new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve('')
          }, 10_000)
        }),
      ]).catch(() => '')

      return {
        url: this.sanitizeUrl(url),
        title,
        htmlSize,
        userAgent,
        localStorage: this.sanitizeStorage(localStorage),
        sessionStorage: this.sanitizeStorage(sessionStorage),
        cookies: cookies.length,
        htmlDump,
      }
    } catch (error) {
      this.logger.warn('Failed to collect page information', error as Error)
      return null
    }
  }

  /**
   * 他のページ情報を収集する
   * @param browser ブラウザ
   * @param mainPage メインページ
   * @returns 他のページ情報の配列
   */
  private async collectOtherPagesInfo(
    browser: Browser,
    mainPage: Page
  ): Promise<any[]> {
    try {
      const pages = await browser.pages()
      const otherPages = pages.filter((p) => p !== mainPage && !p.isClosed())

      const otherPagesInfo = await Promise.all(
        otherPages.map(async (p) => {
          try {
            const [url, title, htmlSize, htmlDump] = await Promise.all([
              Promise.resolve(p.url()),
              p.title().catch(() => ''),
              p
                .evaluate(() => document.documentElement.outerHTML.length)
                .catch(() => -1),
              p.content().catch(() => ''),
            ])

            return {
              url: this.sanitizeUrl(url),
              title,
              htmlSize,
              htmlDump,
            }
          } catch {
            return null
          }
        })
      )

      return otherPagesInfo.filter((info) => info !== null)
    } catch (error) {
      this.logger.warn(
        'Failed to collect other page information',
        error as Error
      )
      return []
    }
  }

  /**
   * すべてのタブのスクリーンショットを保存する
   * @param browser ブラウザ
   * @param methodName メソッド名
   * @param timestamp タイムスタンプ
   */
  private async saveAllTabsScreenshots(
    browser: Browser,
    methodName: string,
    timestamp: Date
  ): Promise<void> {
    try {
      const pages = await browser.pages()
      const openPages = pages.filter((p) => !p.isClosed())

      // 並列実行でスクリーンショットを保存
      await Promise.all(
        openPages.map(async (p, index) => {
          try {
            // タイムアウト 5 秒で保存（unhandled rejection を防ぐため catch を付ける）
            await Promise.race([
              this.takeScreenshotForTab(p, methodName, timestamp, index).catch(
                (error: unknown) => {
                  // スクリーンショット取得失敗時はログを出力してエラーを吸収する
                  this.logger.warn(
                    `Tab ${index} screenshot save failed`,
                    error as Error
                  )
                }
              ),
              sleep(5000),
            ])
          } catch (error) {
            this.logger.warn(
              `Tab ${index} screenshot save failed`,
              error as Error
            )
          }
        })
      )
    } catch (error) {
      this.logger.warn(
        'すべてのタブのスクリーンショット保存に失敗しました',
        error as Error
      )
    }
  }

  /**
   * タブのスクリーンショットを保存する
   * @param page ページ
   * @param methodName メソッド名
   * @param timestamp タイムスタンプ
   * @param tabIndex タブインデックス
   */
  private async takeScreenshotForTab(
    page: Page,
    methodName: string,
    timestamp: Date,
    tabIndex: number
  ): Promise<void> {
    if (!this.screenshotConfig.enabled) {
      return
    }

    const providerName = this.constructor.name.toLowerCase()
    const dateDir = timestamp.toISOString().split('T')[0]
    const screenshotDir = path.join(
      this.screenshotConfig.directory,
      providerName,
      dateDir
    )

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true })
    }

    const timestampStr = timestamp
      .toISOString()
      .replaceAll(/[:.TZ]/g, '-')
      .replaceAll(/-$/g, '')
    const suffix = tabIndex === 0 ? '' : `_tab${tabIndex}`
    const filename = `${timestampStr}_${methodName}_error${suffix}.png`
    const filepath = path.join(screenshotDir, filename)

    // ビューポートサイズを確認
    const viewport = page.viewport()
    if (!viewport || viewport.width === 0 || viewport.height === 0) {
      this.logger.warn(
        `スクリーンショットをスキップ: ビューポートサイズが不正です (${viewport?.width ?? 0}x${viewport?.height ?? 0})`
      )
      return
    }

    await page.screenshot({
      path: filepath,
      fullPage: true,
    })
  }

  /**
   * ブラウザを初期化する
   *
   * Puppeteer ブラウザを起動し、診断情報収集のための
   * targetcreated イベントリスナーを設定する
   *
   * @returns ブラウザインスタンス
   */
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

    const browser = await puppeteer.launch(launchOptions)

    // 新しいページが作成されたら診断情報の収集を設定
    browser.on('targetcreated', (target) => {
      if ((target.type() as string) === 'page') {
        target
          .page()
          .then((page) => {
            if (page) {
              this.setupPageDiagnostics(page)
            }
          })
          .catch(() => {
            // ページ取得に失敗しても無視
          })
      }
    })

    return browser
  }

  /**
   * ページを初期化する
   *
   * 新しいページを作成し、User-Agent 設定、ステルスモード設定、
   * フィンガープリント対策、診断情報収集の設定を行う
   *
   * @param browser ブラウザインスタンス
   * @returns ページインスタンス
   */
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

    // メインページの診断情報セットアップを同期的に実行
    if (this.diagnosticsConfig.enabled) {
      this.setupPageDiagnostics(page)
    }

    return page
  }

  /**
   * ブラウザを安全にクローズする
   *
   * タイムアウト（120 秒）と強制終了のフォールバックを含む
   *
   * @param browser ブラウザインスタンス
   */
  private async closeBrowserSafely(browser: Browser): Promise<void> {
    this.logger.info('close browser')

    const closePromise = browser.close()
    const timeoutPromise = new Promise<void>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Browser close timeout (120s)'))
      }, 120_000)
    })

    try {
      await Promise.race([closePromise, timeoutPromise])
      this.logger.info('Browser closed successfully')
    } catch (error) {
      this.logger.error('Browser close failed or timed out', error as Error)

      try {
        const process = browser.process()
        if (process) {
          this.logger.warn('Killing browser process with SIGKILL')
          process.kill('SIGKILL')
          this.logger.info('Browser process killed')
        } else {
          this.logger.warn('Browser process not available for killing')
        }
      } catch (killError) {
        this.logger.error('Failed to kill browser process', killError as Error)
      }
    }
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
    await this.closeBrowserSafely(browser)
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
    await this.closeBrowserSafely(browser)
  }

  /**
   * メソッドを実行する（エラーハンドリング・スクリーンショット・ポイントログ付き）
   *
   * メソッド実行前後で広告ポップアップ（Google Rewarded Ads）をチェックし、
   * 表示されていれば処理する。また、メソッド実行中も定期的に広告を監視する。
   *
   * ProtocolError, TimeoutError, TargetCloseError が発生した場合は、広告ポップアップの
   * チェック後にページをリロードして次のメソッド実行に備える（Issue #407, #414, #448）。
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

    // ゲームフィルタリングチェック
    if (!this.shouldRun(name)) {
      this.logger.info(`⏭️ ${name}: スキップ（フィルター対象外）`)
      return
    }

    const startTime = Date.now()
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
        this.logger.warn(`${name}: Failed to get point (before execution)`)
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
          this.logger.warn(`${name}: Failed to get point (after execution)`)
        }
      }
    } catch (error) {
      // 診断情報が有効な場合は、診断情報保存時に全タブのスクリーンショットを撮影するため、ここではスキップ
      if (!this.diagnosticsConfig.enabled) {
        await this.takeScreenshot(page, name, 'error')
      }

      // 診断情報を保存（失敗しても元のエラーを妨げない）
      if (this.diagnosticsConfig.enabled) {
        try {
          const executionTime = Date.now() - startTime
          const browser = page.browser()
          await this.saveDiagnostics(
            browser,
            page,
            name,
            error as Error,
            executionTime
          )
        } catch (diagnosticsError) {
          this.logger.warn(
            `${name}: Failed to save diagnostics`,
            diagnosticsError as Error
          )
        }
      }

      this.logger.error('Error', error as Error)

      // ProtocolError, TimeoutError, TargetCloseError の場合は、広告チェック後にリロードして復帰を試みる
      // 広告ポップアップが表示された状態でブラウザがフリーズするケースへの対策（Issue #407, #414）
      // TimeoutError, TargetCloseError も追加（Issue #448）
      const recoverableErrors = [
        'ProtocolError',
        'TimeoutError',
        'TargetCloseError',
      ]
      if (recoverableErrors.includes((error as Error).name)) {
        // ページの健全性確認
        if (page.isClosed()) {
          this.logger.warn(
            `${name}: ページが閉じられているため、復帰できません`
          )
          throw error
        }

        this.logger.warn(
          `${name}: ${(error as Error).name} が発生したため、広告チェック後にページをリロードして復帰を試みます`
        )
        // エラー後に広告ポップアップを処理（フリーズの原因になった可能性がある）
        // ページが開いている場合のみ広告処理を試行（TargetCloseError の再発を防止）
        if (!page.isClosed()) {
          try {
            await this.handleRewardedAd(page)
          } catch {
            // 広告処理に失敗しても続行
          }
        }
        try {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 })
          this.logger.info(`${name}: ページのリロードに成功しました`)
        } catch (reloadError) {
          this.logger.warn(
            `${name}: ページのリロードに失敗しました: ${(reloadError as Error).message}`
          )
        }
        // 復帰可能なエラーの場合は throw せず、次のメソッド実行に進む
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
      this.logger.warn('Failed to click rewarded ad button')
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
          this.logger.warn('Failed to click close button')
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
   * 5 秒間隔で広告ポップアップのセレクター（button.fc-rewarded-ad-button）の
   * 存在を isExistsSelector でチェックし、検出された場合は
   * handleRewardedAd() で処理する。
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

      // 古いスクリーンショットと診断情報の削除（セッションごとに1回のみ実行）
      if (!this.fileCleanupDone) {
        this.fileCleanupDone = true
        // バックグラウンドで非同期実行
        this.cleanupOldFiles().catch((error: unknown) => {
          this.logger.warn(
            `Failed to cleanup old files: ${(error as Error).message}`
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
   * 古いスクリーンショットと診断情報を削除する（非同期）
   */
  private async cleanupOldFiles(): Promise<void> {
    // スクリーンショットのクリーンアップ
    await this.cleanupOldFilesInDirectory(
      this.screenshotConfig.directory,
      this.screenshotConfig.retentionDays,
      'screenshots'
    )

    // 診断情報のクリーンアップ
    if (this.diagnosticsConfig.enabled) {
      await this.cleanupOldFilesInDirectory(
        this.diagnosticsConfig.directory,
        this.diagnosticsConfig.retentionDays,
        'diagnostics'
      )
    }
  }

  /**
   * 指定されたディレクトリ配下の古いファイルを削除する（非同期）
   *
   * @param baseDir ベースディレクトリ
   * @param retentionDays 保持期間（日数）
   * @param fileType ファイルタイプ（ログ出力用）
   */
  private async cleanupOldFilesInDirectory(
    baseDir: string,
    retentionDays: number,
    fileType: string
  ): Promise<void> {
    if (!fs.existsSync(baseDir)) {
      return
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0) // 今日の 00:00:00

    // プロバイダーディレクトリを走査
    const providers = await fs.promises.readdir(baseDir)
    for (const provider of providers) {
      const providerDir = path.join(baseDir, provider)
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
          this.logger.info(`Deleted old ${fileType}: ${dateDirPath}`)
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
   * 指定されたゲームを実行すべきかどうかを判定する
   * @param gameName ゲーム名
   * @returns 実行すべき場合は true
   */
  protected shouldRun(gameName: string): boolean {
    // フィルターが指定されていない場合は全て実行
    if (!this.gamesFilter || this.gamesFilter.length === 0) {
      return true
    }

    // フィルターに含まれている場合のみ実行
    return this.gamesFilter.includes(gameName)
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
