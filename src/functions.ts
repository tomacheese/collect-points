import log4js from "log4js";
import path from "path";
import { Page } from "puppeteer";

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

export async function getNewTabPage(
  logger: log4js.Logger,
  page: Page,
  elementSelector: string
) {
  logger.info(`getNewTabPage()`);
  const browser = page.browser();
  const beforeOpenPages = (await browser.pages()).length;
  logger.info(`beforeOpenPages: ${beforeOpenPages}`);

  await sleep(1000);
  logger.info(`click element`);
  await page
    .waitForSelector(elementSelector)
    .then((element) => element?.click());

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
