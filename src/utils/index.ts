// ユーティリティ関数のエクスポート
export {
  sleep,
  isCloudflareChallenge,
  waitForCloudflareChallenge,
  calcEarnedPoint,
  calcEarnedYen,
  isExistsSelector,
  getPageCount,
  getNewTabPage,
  getNewTabPageFromSelector,
  waitForUrl,
  scrollToBottom,
  finishedNotify,
} from './functions'

export { getVersion } from './version'

// 安全な操作ユーティリティ
export { safeGoto, safeWaitForNavigation, smartClick } from './safe-operations'
