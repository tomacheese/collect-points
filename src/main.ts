import PointTownCrawler from "./providers/pointtown";

(async () => {
  const crawler = new PointTownCrawler();
  await crawler.run(true);
})();
