import fs from "fs";
import { Logger } from "log4js";
import puppeteer, { Browser, Page } from "puppeteer";
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
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }
    const browser = await puppeteer.launch({
      headless: !debug,
      slowMo: 100,
      userDataDir: `data/${this.constructor.name.toLowerCase()}`,
    });
    const _page = await browser.newPage();
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
