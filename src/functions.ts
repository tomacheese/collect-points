import axios from "axios";
import config from "config";
import log4js from "log4js";
import path from "path";
import { ElementHandle, Page } from "puppeteer";

const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

export function getLogger(scriptName: string) {
  log4js.configure({
    appenders: {
      console: {
        type: "console",
      },
      system: {
        type: "dateFile",
        filename: path.join("logs", scriptName),
        pattern: "_yyyy-MM-dd.log",
        keepFileExt: true,
        alwaysIncludePattern: true,
        daysToKeep: 10,
        layout: {
          type: "pattern",
          pattern: "[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %m",
        },
      },
    },
    categories: {
      default: {
        appenders: ["console", "system"],
        level: "all",
      },
    },
  });
  return log4js.getLogger(scriptName);
}

export async function isExistsSelector(
  page: Page,
  selector: string
): Promise<boolean> {
  return new Promise((resolve) => {
    page
      .waitForSelector(selector, { visible: true, timeout: 3000 })
      .then(() => {
        resolve(true);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

export async function getNewTabPageFromSelector(
  logger: log4js.Logger,
  page: Page,
  elementSelector: string
): Promise<Page | null> {
  await page.waitForSelector(elementSelector);
  return getNewTabPage(logger, page, await page.$(elementSelector));
}
export async function getNewTabPage(
  logger: log4js.Logger,
  page: Page,
  element: ElementHandle<Element> | null
): Promise<Page | null> {
  logger.info(`getNewTabPage()`);
  const browser = page.browser();
  const beforeOpenPages = (await browser.pages()).length;
  logger.info(`beforeOpenPages: ${beforeOpenPages}`);

  await sleep(1000);
  logger.info(`click element`);
  element?.click();

  let successful = false;
  for (let i = 0; i < 30; i++) {
    // wait 30 seconds
    logger.info(`[${i}] getting pages`);
    const pages = await browser.pages();
    const afterOpenPages = pages.length;
    logger.info(`[${i}] afterOpenPages: ${afterOpenPages}`);
    if (beforeOpenPages < afterOpenPages) {
      successful = true;
      logger.info(`[${i}] successful, break`);
      break;
    }
    logger.info(`[${i}] wait 1 sec`);
    await sleep(1000);
    logger.info(`[${i}] next...`);
  }
  if (!successful) {
    logger.info(`not successful`);
    return null;
  }
  logger.info(`afterOpenPages: successful`);
  const pages = await browser.pages();
  const newPage = pages[pages.length - 1];
  await sleep(3000);
  return newPage;
}

export function sendMessage(channel: string, message: string) {
  axios
    .post(
      `https://discordapp.com/api/channels/${channel}/messages`,
      {
        content: message,
      },
      {
        headers: {
          "content-type": "application/json",
          Authorization: `Bot ${config.get("discordToken")}`,
        },
      }
    )
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
}

export function startNotify(targetScript: string) {
  sendMessage(
    "643815908753539072",
    `:ballot_box_with_check: Start script: \`${targetScript}\``
  );
}
export function finishedNotify(
  targetScript: string,
  beforePt: number,
  afterPt: number,
  rate: number
) {
  const earnedPt = calcEarnedPoint(beforePt, afterPt);
  let earnedYen;
  if (rate != undefined) {
    earnedYen = calcEarnedYen(earnedPt, rate);
  } else {
    earnedYen = null;
  }
  // saveCurrentPoint(targetScript, afterPt, earnedPt, earnedYen);
  sendMessage(
    "643815908753539072",
    `:ballot_box_with_check: Finished script: \`${targetScript}\` (\`${beforePt}\`pt -> \`${afterPt}\`pt | Earned: \`${earnedPt}\`pt, \`${earnedYen}\`yen)`
  );
}

export function calcEarnedPoint(prevPoint: number, currPoint: number) {
  return +(currPoint - prevPoint).toFixed(2);
}
export function calcEarnedYen(earnedPoint: number, rate: number) {
  return +(earnedPoint * rate).toFixed(2);
}
