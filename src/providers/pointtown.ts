import { BaseCrawler } from "@/baseProvider";
import {
  finishedNotify,
  getNewTabPage,
  getNewTabPageFromSelector,
  isExistsSelector,
} from "@/functions";
import config from "config";
import fs from "fs";
import { Browser, Page } from "puppeteer";

export default class PointTownCrawler extends BaseCrawler {
  protected async crawl(_: Browser, page: Page) {
    this.logger.info("crawl()");
    const beforePoint = await this.getCurrentPoint(page);
    this.logger.info(`beforePoint: ${beforePoint}`);

    await this.triangleLot(page);
    await this.pointQ(page);
    await this.mailCheck(page);
    await this.pointChance(page);
    await this.competition(page);
    await this.usapo(page);
    await this.pointNumbers(page);
    await this.easyGame(page);
    await this.lottery(page);
    await this.collection(page);
    await this.stamprally(page);

    // gesoten https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L1033
    // gacha https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L1076
    // kokki https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L401
    // proverb https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L512
    // eitango https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L649
    // news https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L1150
    // gacha_smf https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L1115
    // news_smf https://github.com/book000/rewards-bot_raspi/blob/2a45de79ff378f196c469c10c5252c2fddb6e6ad/scripts/pointtown.js#L1228

    const afterPoint = await this.getCurrentPoint(page);
    this.logger.info(`afterPoint: ${afterPoint}`);
    finishedNotify(this.constructor.name, beforePoint, afterPoint, 0.05);
  }

  protected async checkAlreadyLogin(page: Page): Promise<boolean> {
    this.logger.info("checkAlreadyLogin()");
    await page.goto("https://www.pointtown.com/ptu/mypage/top", {
      waitUntil: "networkidle2",
    });
    return await isExistsSelector(page, "span.pt-status-block__content--point");
  }

  async login(page: Page): Promise<void> {
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
  async triangleLot(page: Page): Promise<void> {
    this.logger.info("triangleLot()");
    await this.triangleLotRed(page);
    await this.triangleLotYellow(page);
    await this.triangleLotPurple(page);
    await this.triangleLotPink(page);
    await this.triangleLotBlue(page);
    await this.triangleLotGreen(page);
  }

  async triangleLotRed(page: Page): Promise<void> {
    this.logger.info("triangleLotRed()");
    await page.goto("https://www.pointtown.com/ptu/shopping", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotYellow(page: Page): Promise<void> {
    this.logger.info("triangleLotYellow()");
    await page.goto(
      "https://www.pointtown.com/ptu/service/category/cmCatId-10001/sort-0",
      {
        waitUntil: "networkidle2",
      }
    );

    await this.checkTriangleLot(page);
  }

  async triangleLotPurple(page: Page): Promise<void> {
    this.logger.info("triangleLotPurple()");
    await page.goto("https://www.pointtown.com/ptu/creditcard/index.do", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotPink(page: Page): Promise<void> {
    this.logger.info("triangleLotPink()");
    await page.goto("https://www.pointtown.com/ptu/enquete/top", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotBlue(page: Page): Promise<void> {
    this.logger.info("triangleLotBlue()");
    await page.goto("https://www.pointtown.com/ptu/top", {
      waitUntil: "networkidle2",
    });

    await this.checkTriangleLot(page);
  }

  async triangleLotGreen(page: Page): Promise<void> {
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

  async checkTriangleLot(page: Page): Promise<void> {
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

    const newPage = await getNewTabPageFromSelector(
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

  /**
   * ポイントQ
   * @param page ページ
   */
  async pointQ(page: Page): Promise<void> {
    this.logger.info("pointQ()");
    for (let i = 0; i < 4; i++) {
      await page.goto("https://www.pointtown.com/ptu/quiz/input.do", {
        waitUntil: "networkidle2",
      });

      try {
        await page.waitForSelector(".today_Qtxt", {
          timeout: 5000,
        });
      } catch (e) {
        this.logger.info(`today already answered: ${(e as Error).message}`);
        return;
      }
      const question = await page.evaluate(
        () => document.getElementsByClassName("today_Qtxt")[0].textContent
      );
      if (question == null) {
        this.logger.error("question not found.");
        return;
      }
      this.logger.info(`question: ${question}`);
      let labels = await page.$$("form label p");
      const json = fs.existsSync("data/pointq.json")
        ? JSON.parse(fs.readFileSync(`data/pointq.json`, "utf8"))
        : {};
      if (json[question] != undefined) {
        let answer = json[question];
        this.logger.info(`know answer: ${answer}`);
        let choicebool = false;
        for (let l = 0; l < labels.length; l++) {
          let choice = await page.evaluate(
            (l) =>
              document.querySelectorAll("form label p")[l].textContent?.trim(),
            l
          );
          this.logger.info(`choice ${l}: ${choice}`);
          if (choice == answer) {
            this.logger.info(`this!`);
            await labels[l].click();
            choicebool = true;
            break;
          }
        }
        if (!choicebool) {
          this.logger.info(`choice error...`);
          delete json[question];
          let i;
          if (labels.length >= 1) {
            i = Math.floor(Math.random() * labels.length);
            await labels[i].click();
          }
        }
      } else {
        this.logger.info(`dont know answer...`);
        let i;
        if (labels.length >= 1) {
          i = Math.floor(Math.random() * labels.length);
          await labels[i].click();
        }
      }

      await page
        .waitForSelector("#main2c > div > p.answer_btn.clear > a", {
          visible: true,
          timeout: 10000,
        })
        .then((element) => element?.click());

      await page.waitForTimeout(10000);
      await page.waitForSelector(".answer", {
        timeout: 5000,
      });
      let trueanswer = await page.evaluate(
        () => document.getElementsByClassName("answer")[0].textContent
      );
      this.logger.info(`trueanswer: ${trueanswer}`);
      json[question] = trueanswer;
      fs.writeFileSync(`data/pointq.json`, JSON.stringify(json));

      if (i != 4) await page.waitForTimeout(190000);
    }
  }

  /**
   * ポイントメールボックス
   * @param page ページ
   */
  async mailCheck(page: Page): Promise<void> {
    this.logger.info("mail_check()");
    await page.goto("https://www.pointtown.com/ptu/mailbox", {
      waitUntil: "networkidle2",
    });

    if (!isExistsSelector(page, ".pt-section__content ul.pt-list")) {
      this.logger.info('".pt-section__content ul.pt-list" is not found');
      return;
    }
    const mails = await page.$$(".pt-section__content ul.pt-list li");
    for (let a of mails) {
      if ((await a.$(".pt-list__badge--point")) == null) {
        this.logger.log("not point... continue!");
        continue;
      }
      this.logger.log("point.");

      let id = await page.evaluate(
        (element) => element.getAttribute("data-href"),
        a
      );
      id = id.match(/id-([0-9]+)/)[1];
      //let url = await (await a.getProperty("data-href")).jsonValue();
      this.logger.info(`id : ${id}`);
      this.logger.info(
        `https://www.pointtown.com/ptu/mail_box/mail_body/pt/id-${id}`
      );

      const newPage = await page.browser().newPage();
      await newPage.goto(
        `https://www.pointtown.com/ptu/mail_box/mail_body/pt/id-${id}`,
        { waitUntil: "networkidle2" }
      );
      let text = null;
      for (let b = 0; b < 10; b++) {
        text = await newPage.evaluate(() => {
          if (document.querySelector("span#id_mail_body") == null) {
            return null;
          }
          return document.querySelector("span#id_mail_body")?.innerHTML;
        });
        if (text == null) {
          await newPage.waitForTimeout(1000);
          continue;
        }
      }
      if (text == null) {
        this.logger.info("text == null. continue");
        continue;
      }

      //this.logger.info(text);
      let _url = null;
      const pattern1 = text.match(/\[Point\] ?(https?:\/\/.+)/);
      const pattern2 = text.match(/\[Point\] ?(http?:\/\/.+)/);
      const pattern3 = text.match(
        /https?:\/\/www\.pointtown\.com\/ptu\/r\.g\?rid=[A-Za-z0-9]+/
      );

      if (pattern1 != null) {
        _url = pattern1[1];
      } else if (pattern2 != null) {
        _url = pattern2[1];
      } else if (pattern3 != null) {
        _url = pattern3[0];
      }
      if (_url == null) {
        this.logger.info("url not found.");
        await newPage.close();
        continue;
      }
      this.logger.info(`Url: ${_url}`);
      const newPage2 = await page.browser().newPage();
      await newPage2.goto(_url, { waitUntil: "networkidle2" });
      await newPage2.waitForTimeout(10000);
      await newPage2.close();
      await newPage.close();
    }
  }

  /**
   * ポイントチャンス (モニター下部)
   * @param page ページ
   */
  async pointChance(page: Page): Promise<void> {
    this.logger.info("pointchance()");
    await page.goto(
      "https://www.pointtown.com/ptu/monitor/top.do#pointChance",
      { waitUntil: "networkidle2" }
    );
    const anchors = await page.$$("li.pointchanceItem");
    for (let a of anchors) {
      const newPage = await getNewTabPage(this.logger, page, a);
      if (newPage == null) {
        this.logger.error("newPage not found.");
      } else {
        await newPage.waitForTimeout(10000);
        await newPage.close();
      }
    }
  }

  /**
   * ポイント争奪戦
   * @param page ページ
   */
  async competition(page: Page): Promise<void> {
    this.logger.info("competition()");
    await page.goto("https://www.pointtown.com/ptu/competition/entry.do", {
      waitUntil: "networkidle2",
    });
    try {
      await page
        .waitForSelector('.competitionArea a[href*="complete.do"]', {
          visible: true,
          timeout: 10000,
        })
        .then((element) => element?.click());
    } catch (e) {
      this.logger.info((e as Error).message);
    }
  }

  /**
   * ベジモンコレクション
   * @param page ページ
   */
  async collection(page: Page): Promise<void> {
    this.logger.info("collection()");
    try {
      await page.goto("https://www.pointtown.com/ptu/collection/index.do", {
        waitUntil: "networkidle2",
      });
      const anchors = await page.$$(".bnArea a");
      for (let a of anchors) {
        const newPage = await getNewTabPage(this.logger, page, a);
        if (newPage == null) {
          this.logger.error("newPage not found.");
          continue;
        }
        await newPage.waitForTimeout(10000);
        await newPage.close();
      }
      await page.goto(
        "https://www.pointtown.com/ptu/collection/collection.do",
        {
          waitUntil: "networkidle2",
        }
      );
      await page.waitForTimeout(5000);

      const entryBtns = await page.$$(".entryBtn");
      const random = Math.floor(Math.random() * 100);
      this.logger.info(`random: ${random} / ${entryBtns.length}`);
      if (random <= 30) {
        this.logger.info(`random <= 30 -> [0]`);
        entryBtns[0].click();
      } else {
        this.logger.info(`random > 30 -> [3]`);
        entryBtns[3].click();
      }
      await page.waitForTimeout(5000);
    } catch (e) {
      this.logger.info(`Error: ${(e as Error).message} / Skip`);
    }
  }

  /**
   * ウサポ
   * @param page ページ
   */
  async usapo(page: Page): Promise<void> {
    this.logger.info("usapo()");

    await page.goto("https://www.pointtown.com/ptu/travel", {
      waitUntil: "networkidle2",
    });
    try {
      await page
        .waitForSelector('img[src*="kuji_usapo.gif"]', {
          visible: true,
          timeout: 10000,
        })
        .then((img) => img?.click());

      const newPage = await getNewTabPageFromSelector(
        this.logger,
        page,
        "#clickBx2 a img"
      );
      if (newPage == null) {
        this.logger.error("newPage not found.");
        return;
      } else {
        await newPage.waitForTimeout(10000);
        await newPage.close();
      }

      await page
        .waitForSelector('img[src*="kuji_kumapo.gif"]', {
          visible: true,
          timeout: 10000,
        })
        .then((img) => img?.click());
    } catch (e) {
      this.logger.info((e as Error).message);
    }
    await page.waitForTimeout(15000);
  }

  /**
   * ポイントナンバー
   * @param page ページ
   */
  async pointNumbers(page: Page): Promise<void> {
    try {
      this.logger.info("pointNumbers()");
      let dayOfWeek = new Date().getDay();
      if (dayOfWeek == 0 || dayOfWeek == 1) {
        this.logger.info(`Today is ${dayOfWeek}. return.`);
        return;
      }
      this.logger.info(`Today is ${dayOfWeek}. continue`);

      await page.goto(
        "https://www.pointtown.com/ptu/pointpark/game/numbers/top.do",
        {
          waitUntil: "networkidle2",
        }
      );
      this.logger.info("click #main2c > div.numbersEntryBtn > a > img");
      await page
        .waitForSelector(`#main2c > div.numbersEntryBtn > a > img`, {
          visible: true,
        })
        .then((element) => element?.click());
      await page.waitForTimeout(5000);
      this.logger.info("wait select");
      await page.waitForSelector("select", {
        visible: true,
        timeout: 10000,
      });
      this.logger.info("select chosenNumber 1");
      await page.evaluate(() => {
        const chosenNumber = document.querySelector(
          'select[name="chosenNumber"]'
        );
        if (chosenNumber == null) {
          return;
        }
        (chosenNumber as HTMLSelectElement).selectedIndex = Math.floor(
          Math.random() * 10
        );
      });
      this.logger.info("select chosenNumber 2");
      await page.evaluate(() => {
        const chosenNumber = document.querySelector(
          'select[name="chosenNumber"]'
        );
        if (chosenNumber == null) {
          return;
        }
        (chosenNumber as HTMLSelectElement).selectedIndex = Math.floor(
          Math.random() * 10
        );
      });
      await page.waitForTimeout(5000);
      this.logger.info("click numbersSelect");
      await page
        .waitForSelector(
          `#numbersSelect > form > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=image]`,
          {
            visible: true,
          }
        )
        .then((element) => element?.click());
      await page.waitForTimeout(5000);
    } catch (e) {
      this.logger.info((e as Error).message);
    }
  }

  /**
   * かんたんゲームボックス
   * @param page ページ
   */
  async easyGame(page: Page): Promise<void> {
    this.logger.info("easyGame()");

    await page.goto("https://www.pointtown.com/ptu/game/easygame2.do", {
      waitUntil: "networkidle2",
    });
    await page
      .waitForSelector("button.btn-receive")
      .then((element) => element?.click())
      .catch(() => {});
  }

  /**
   * 宝くじ
   * @param page ページ
   */
  async lottery(page: Page): Promise<void> {
    this.logger.info("lottery()");

    await page.goto("https://www.pointtown.com/ptu/lottery", {
      waitUntil: "networkidle2",
    });
    await page.waitForTimeout(5000);
    try {
      this.logger.info("モーダルウィンドウ開く");
      await page
        .waitForSelector("#modal-opener", {
          visible: true,
          timeout: 10000,
        })
        .then((a) => a?.click());
      this.logger.info("枚数選択のselect存在確認");
      await page.waitForSelector(
        "#ex > table > tbody > tr:nth-child(1) > td > select",
        {
          visible: true,
          timeout: 10000,
        }
      );
      this.logger.info("全枚数選択");
      await page.evaluate(() => {
        const select = document.querySelector(
          "#ex > table > tbody > tr:nth-child(1) > td > select"
        );
        if (select == null) {
          return;
        }
        (select as HTMLSelectElement).selectedIndex =
          (select as HTMLSelectElement).length - 1;
      });
      this.logger.info("交換");
      await page
        .waitForSelector("#btn-exchange", {
          visible: true,
          timeout: 10000,
        })
        .then((a) => a?.click());
      await page.waitForTimeout(5000);

      this.logger.info("当選確認をする");
      await page.evaluate(() => {
        if (document.getElementsByClassName("pt-body")[0] != null) {
          document.getElementsByClassName("pt-body")[0].scrollIntoView({
            block: "center",
            inline: "center",
          });
        }
      });
      await page
        .waitForSelector("#check-tosen", {
          visible: true,
          timeout: 1000,
        })
        .then((a) => a?.click());
      await page.waitForTimeout(10000);

      this.logger.info("当選申請をする");
      await page.evaluate(() => {
        if (document.getElementsByClassName("pt-body")[0] != null) {
          document.getElementsByClassName("pt-body")[0].scrollIntoView();
        }
      });
      await page
        .waitForSelector("#check-tosen", {
          visible: true,
          timeout: 10000,
        })
        .then((a) => a?.click());
      await page.waitForTimeout(5000);

      this.logger.info("バナークリック");
      await page
        .waitForSelector(".center img", {
          visible: true,
        })
        .then((a) => a?.click());
      await page.waitForTimeout(5000);
    } catch (e) {
      this.logger.info((e as Error).message);
    }
  }

  async stamprally(page: Page): Promise<void> {
    this.logger.info("stamprally()");

    await page.goto("https://www.pointtown.com/ptu/mypage/top", {
      waitUntil: "networkidle2",
    });
    try {
      await page
        .waitForSelector("a.stamp-cl-btn", {
          visible: true,
          timeout: 10000,
        })
        .then((element) => element?.click());
    } catch (e) {
      /*
       */
      // タイムアウトの場合は次の処理へ進む
      this.logger.info((e as Error).message);
    }
  }
}
