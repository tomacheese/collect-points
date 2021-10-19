import { BaseCrawler } from "@/baseprovider";
import { Browser, Page } from "puppeteer";

export default class TestCrawler extends BaseCrawler {
  protected async crawl(_: Browser, page: Page) {
    await page
      .goto("https://tomacheese.com/")
      .then((response) => console.log(response.headers()));
  }
}
