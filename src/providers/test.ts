import { BaseCrawler } from "@/baseProvider";
import { Browser, Page } from "puppeteer";

export default class TestCrawler extends BaseCrawler {
  protected async crawl(_: Browser, page: Page) {
    this.logger.info("crawl");
    await page
      .goto("https://tomacheese.com/")
      .then((response) => console.log(response.headers()));
  }

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    return true;
  }

  protected login(_: Page): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
