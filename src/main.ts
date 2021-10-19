import TestCrawler from "./providers/test";

(async () => {
  const crawler = new TestCrawler();
  await crawler.run();
})();
