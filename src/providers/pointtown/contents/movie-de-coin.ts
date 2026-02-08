import type { Dialog, Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'
import { safeGoto } from '@/utils/safe-operations'

/**
 * 動画でコインを実行する
 * @param context PointTown コンテキスト
 * @param page ページ
 */
export async function movieDeCoin(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('movieDeCoin()')

  // ダイアログ（音声付き再生確認）を自動承認するハンドラー
  const dialogHandler = (dialog: Dialog) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    dialog.accept().then(() => {
      context.logger.info('動画再生確認ダイアログを承認')
    })
  }

  // ダイアログハンドラーをページ遷移前に登録
  page.on('dialog', dialogHandler)

  try {
    await safeGoto(
      page,
      'https://www.pointtown.com/movie-de-coin',
      context.logger,
      { preferNetworkIdle: true }
    )

    // 残り回数を確認
    const remainingText = await page
      .$eval('.movie-point-time__title', (el) =>
        el.textContent ? el.textContent.trim() : ''
      )
      .catch(() => '')

    // 「あと、N回見れるよ」から残り回数を抽出
    const remainingMatch = /(\d+)回/.exec(remainingText)
    const remainingCount = remainingMatch
      ? Number.parseInt(remainingMatch[1], 10)
      : 0

    if (remainingCount === 0) {
      context.logger.info('この時間帯の動画視聴回数は上限に達しています')
      return
    }

    context.logger.info(`残り視聴可能回数: ${remainingCount}`)

    // 動画を視聴（残り回数分繰り返す）
    for (let i = 0; i < remainingCount; i++) {
      context.logger.info(`動画視聴 ${i + 1}/${remainingCount} 回目`)

      // 動画再生ボタンをクリック
      const playButton = await page
        .waitForSelector('button.js-ad-mov-trigger-btn', {
          visible: true,
          timeout: 10_000,
        })
        .catch(() => null)

      if (playButton === null) {
        context.logger.info('動画再生ボタンが見つかりません')
        break
      }

      await playButton.click()
      context.logger.info('動画再生ボタンをクリック、広告視聴待機中...')

      // 広告視聴完了を待機（最大 60 秒、再生ボタンが再表示されたら完了）
      const adMaxWaitMs = 60_000
      const adCheckIntervalMs = 1000
      const adStartTime = Date.now()
      let adCompleted = false

      while (Date.now() - adStartTime < adMaxWaitMs) {
        // 再生ボタンが再び表示されたら、広告視聴が完了したとみなす
        const adPlayButton = await page.$('button.js-ad-mov-trigger-btn')
        if (adPlayButton !== null) {
          const box = await adPlayButton.boundingBox()
          if (box !== null) {
            adCompleted = true
            break
          }
        }
        await sleep(adCheckIntervalMs)
      }

      if (adCompleted) {
        context.logger.info('広告視聴完了を検知しました')
      } else {
        context.logger.warn(
          '広告視聴完了を検知できなかったため、タイムアウトまで待機しました'
        )
      }

      // ページをリロードして次の動画を視聴
      await safeGoto(
        page,
        'https://www.pointtown.com/movie-de-coin',
        context.logger,
        { preferNetworkIdle: true }
      )

      // 次のループの前に少し待機
      await sleep(3000)
    }

    context.logger.info('動画でコイン完了')
  } finally {
    // ダイアログハンドラーを削除
    page.off('dialog', dialogHandler)
  }
}
