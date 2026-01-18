// puppeteer を rebrowser-puppeteer-core にリダイレクトする型定義
declare module 'puppeteer' {
  export * from 'rebrowser-puppeteer-core'
}

declare module 'puppeteer-core' {
  export * from 'rebrowser-puppeteer-core'
}
