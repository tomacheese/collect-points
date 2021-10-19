import { BaseCrawler } from "@/baseProvider";
import { getNewTabPage, isExistsSelector } from "@/functions";
import config from "config";
import { Browser, Page } from "puppeteer";

export default class PointTownCrawler extends BaseCrawler {
  protected async crawl(_: Browser, page: Page) {
    this.logger.info("crawl()");
    const beforePoint = await this.getCurrentPoint(page);
    this.logger.info(`beforePoint: ${beforePoint}`);
    this.triangleLot(page);
  }

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info("checkAlreadyLogin()");
    await page.goto("https://www.pointtown.com/ptu/mypage/top", {
      waitUntil: "networkidle2",
    });
    return await isExistsSelector(page, "span.pt-status-block__content--point");
  }

  async login(page: Page) {
    this.logger.info("login()");
    await page.goto(
      "https://www.pointtown.com/ptu/show_login.do?nextPath=%2Fptu%2Ftop",
      { waitUntil: "networkidle2" }
    );
    await page
      .waitForSelector("img.Icon--Yahoo")
      .then((element) => element?.click());

    await page.waitForNavigation({ waitUntil: "networkidle2" });

    await page
      .waitForSelector("input#username")
      .then((element) => element?.type(config.get("pointtown.yahoo_id")));
    await page
      .waitForSelector("button#btnNext")
      .then((element) => element?.click());
    await page
      .waitForSelector("input#passwd")
      .then((element) => element?.type(config.get("pointtown.password")));
    await page
      .waitForSelector("button#btnSubmit")
      .then((element) => element?.click());

    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const isGMOCheckPage = await isExistsSelector(
      page,
      'button[type="submit"]'
    );

    if (isGMOCheckPage) {
      await page
        .waitForSelector('button[type="submit"]')
        .then((element) => element?.click())
        .catch(() => {});

      await page
        .waitForNavigation({ waitUntil: "networkidle2" })
        .catch(() => {});
    }

    const isCheckSecretAnswer = await isExistsSelector(page, "input#answer");
    if (isCheckSecretAnswer) {
      await page
        .waitForSelector("input#answer")
        .then((element) => element?.type(config.get("pointtown.secret_answer")))
        .catch(() => {});
      await page
        .waitForSelector("input.pt-submit-btn")
        .then((element) => element?.click())
        .catch(() => {});
    }

    await page.waitForTimeout(3000);
  }

  async getCurrentPoint(page: Page): Promise<number> {
    this.logger.info("getCurrentPoint()");
    await page.goto("https://www.pointtown.com/ptu/mypage/point_history", {
      waitUntil: "networkidle2",
    });

    let nPointText = await page.$eval(
      "dd.pt-definition-alignment__desc",
      (el) => el.textContent
    );
    if (nPointText == null) {
      return -1;
    }
    if (!/^\s*[\d,]+pt/.test(nPointText)) {
      return -1;
    }
    nPointText = nPointText.replace(/pt.*$/, "").replace(/[,\s]/g, "");
    return parseInt(nPointText, 10);
  }

  /**
   * 三角くじ
   * @param page ページ
   */
  async triangleLot(page: Page) {
    this.logger.info("triangleLot()");
    await this.triangleLotRed(page);
    await this.triangleLotYellow(page);
    await this.triangleLotPurple(page);
    await this.triangleLotPink(page);
    await this.triangleLotBlue(page);
    await this.triangleLotGreen(page);
  }

  async triangleLotRed(page: Page) {
    this.logger.info("triangleLotRed()");
    await page.goto("https://www.pointtown.com/ptu/shopping", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotYellow(page: Page) {
    this.logger.info("triangleLotYellow()");
    await page.goto(
      "https://www.pointtown.com/ptu/service/category/cmCatId-10001/sort-0",
      {
        waitUntil: "networkidle2",
      }
    );

    await this.checkTriangleLot(page);
  }

  async triangleLotPurple(page: Page) {
    this.logger.info("triangleLotPurple()");
    await page.goto("https://www.pointtown.com/ptu/creditcard/index.do", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotPink(page: Page) {
    this.logger.info("triangleLotPink()");
    await page.goto("https://www.pointtown.com/ptu/enquete/top", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotBlue(page: Page) {
    this.logger.info("triangleLotBlue()");
    await page.goto("https://www.pointtown.com/ptu/top", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotGreen(page: Page) {
    this.logger.info("triangleLotBlue()");
    await page.goto("https://www.pointtown.com/ptu/forum/index", {
      waitUntil: "networkidle2",
    });
    await page
      .waitForSelector(".tit_topic a")
      .then((element) => element?.click());
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    await this.checkTriangleLot(page);
  }

  async checkTriangleLot(page: Page) {
    await page.waitForTimeout(3000);
    await page.evaluate(() =>
      document.querySelector("span.pt-icon__kuji")?.scrollIntoView({
        block: "center",
        inline: "center",
      })
    );
    await page
      .waitForSelector("span.pt-icon__kuji")
      .then((element) => element?.click());
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const newPage = await getNewTabPage(
      this.logger,
      page,
      "a#clickDailyBanner"
    );
    if (newPage == null) {
      this.logger.error("newPage not found.");
      return;
    } else {
      await newPage.waitForTimeout(5000);
      await newPage.close();
    }
    await page.waitForTimeout(3000);

    // Wチャンス
    await page
      .waitForSelector("span.pt-icon__kuji")
      .then((element) => element?.click())
      .catch(() => {});
    await page.waitForTimeout(3000);
  }
}
