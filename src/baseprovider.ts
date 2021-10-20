import fs from "fs";
import { Logger } from "log4js";
import { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import { getLogger } from "./functions";

export interface Crawler {
  run(): Promise<void>;
}

export abstract class BaseCrawler implements Crawler {
  logger!: Logger;

  constructor() {
    this.logger = getLogger(this.constructor.name);
  }

  /**
   * クローリングを実施する
   * @param debug デバッグモードで実行するか（ウィンドウを表示する / ブラウザを自動で閉じない）
   * @param method 実行対象のメソッド
   */
  async run(debug: boolean = false, method: any = null): Promise<void> {
    if (!fs.existsSync("user_data")) {
      fs.mkdirSync("user_data");
    }
    const launchOptions = {
      headless: false,
      slowMo: 100,
      userDataDir: `user_data/${this.constructor.name.toLowerCase()}`,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    };

    const browser = await puppeteer.launch(launchOptions);
    const _page = await browser.newPage();
    await _page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0"
    );
    if (method !== null) {
      this.logger.info("Target mode");
      if (!(await this.checkAlreadyLogin(_page))) {
        this.logger.info("is not login");
        await this.login(_page);
      }
      await method.apply(this, [_page]);
    } else {
      this.logger.info("Main mode");
      if (!(await this.checkAlreadyLogin(_page))) {
        this.logger.info("is not login");
        await this.login(_page);
      }
      await this.crawl(browser, _page);
    }
    this.logger.info("close browser");
    if (!debug) await browser.close();
  }

  /**
   * クローリングメインプログラム
   * @param browser ブラウザー
   * @param page ページ
   */
  protected abstract crawl(browser: Browser, page: Page): Promise<void>;

  /**
   * ログインしている状態かを確認する
   * @param page ページ
   * @returns ログインしているか
   */
  protected abstract checkAlreadyLogin(page: Page): Promise<boolean>;

  /**
   * ログインする
   * @param page ページ
   */
  protected abstract login(page: Page): Promise<void>;
}
