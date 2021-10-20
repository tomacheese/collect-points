import fs from "fs";
import PointTownCrawler from "./providers/pointtown";

(async () => {
  if (!fs.existsSync("data")) {
    fs.mkdirSync("data");
  }

  const crawler = new PointTownCrawler();
  await crawler.run(false);
})();
