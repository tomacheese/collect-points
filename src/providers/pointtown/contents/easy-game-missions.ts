import type { ElementHandle, Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { sleep } from '@/utils/functions'

/**
 * テキスト内容でボタンを検索する
 * @param page ページ
 * @param text 検索するテキスト
 * @param exact 完全一致（true）または部分一致（false）
 * @returns ボタン要素（見つからない場合は null）
 */
async function findButtonByText(
  page: Page,
  text: string,
  exact = false
): Promise<ElementHandle<HTMLButtonElement> | null> {
  const button = await page.evaluate(
    (searchText, exactMatch) => {
      const buttons = [...document.querySelectorAll('button')]
      return buttons.find((btn) => {
        const btnText = btn.textContent?.trim() ?? ''
        return exactMatch
          ? btnText === searchText
          : btnText.includes(searchText)
      })
    },
    text,
    exact
  )

  if (!button) {
    return null
  }

  // ボタン要素のハンドルを取得
  const buttons = await page.$$('button')
  for (const btn of buttons) {
    const btnText =
      (await page.evaluate((el) => el.textContent?.trim(), btn)) ?? ''
    if (exact ? btnText === text : btnText.includes(text)) {
      return btn
    }
  }

  return null
}

/**
 * ログインミッションを実行
 * @param context クローラーコンテキスト
 * @param page ページ
 */
async function executeLoginMission(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('📝 ログインミッション実行中...')

  try {
    // 「ログイン」タブが選択されていることを確認（デフォルトで表示されるはず）
    await sleep(2000)

    // 「受け取る」ボタンをクリック
    const receiveButton = await findButtonByText(page, '受け取る', false)

    if (!receiveButton) {
      context.logger.warn(
        '⚠️ ログインミッションの受け取るボタンが見つかりません'
      )
      return
    }

    await receiveButton.click()
    await sleep(2000)

    // ポップアップで「受け取る」ボタンをクリック（広告なしのボタンを探す）
    const buttons = await page.$$('button')
    let popupReceiveButton: ElementHandle<HTMLButtonElement> | null = null

    for (const btn of buttons) {
      const btnText =
        (await page.evaluate((el) => el.textContent?.trim(), btn)) ?? ''
      // 「受け取る」を含み、「広告」を含まないボタンを探す
      if (btnText.includes('受け取る') && !btnText.includes('広告')) {
        popupReceiveButton = btn
        break
      }
    }

    if (popupReceiveButton) {
      await popupReceiveButton.click()
      context.logger.info('✅ ログインミッション報酬を受け取りました')
      await sleep(2000)
    } else {
      context.logger.warn(
        '⚠️ ログインミッションのポップアップボタンが見つかりません'
      )
    }
  } catch (error) {
    context.logger.error('❌ ログインミッション実行エラー:', error as Error)
  }
}

/**
 * ルーレットキャンペーンを実行（1日10回）
 * @param context クローラーコンテキスト
 * @param page ページ
 */
async function executeRouletteCampaign(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('🎰 ルーレットキャンペーン実行中...')

  try {
    // 「ルーレット」タブをクリック
    const rouletteTab = await page
      .waitForSelector('a[href="#roulette"]', {
        visible: true,
        timeout: 5000,
      })
      .catch(() => null)

    if (!rouletteTab) {
      context.logger.warn('⚠️ ルーレットタブが見つかりません')
      return
    }

    await rouletteTab.click()
    await sleep(2000)

    // 1日10回ルーレットを回す
    for (let i = 0; i < 10; i++) {
      context.logger.info(`🎰 ルーレット ${i + 1}/10 回目`)

      // 「ルーレットを回す」ボタンをクリック
      const spinButton = await findButtonByText(page, 'ルーレットを回す', false)

      if (!spinButton) {
        context.logger.info('✅ 本日のルーレット回数上限に達しました')
        break
      }

      await spinButton.click()
      await sleep(2000)

      // 「広告を見てルーレットを回す」ボタンをクリック
      const adButton = await findButtonByText(
        page,
        '広告を見てルーレットを回す',
        false
      )

      if (!adButton) {
        context.logger.warn('⚠️ 広告視聴ボタンが見つかりません、スキップします')
        break
      }

      await adButton.click()
      await sleep(3000)

      // Google Rewarded Ads が表示される場合、URL から #goog_rewarded を除去して再アクセス
      const currentUrl = page.url()
      if (currentUrl.includes('#goog_rewarded')) {
        context.logger.info('📺 広告ポップアップを検出、スキップします')
        const cleanUrl = currentUrl.replace('#goog_rewarded', '')
        await page.goto(cleanUrl, { waitUntil: 'networkidle2' })
        await sleep(2000)
      } else {
        // 広告視聴完了後、ルーレット結果を待つ
        await sleep(5000)
      }

      context.logger.info(`✅ ルーレット ${i + 1} 回目完了`)

      // 次のルーレットのために「ルーレット」タブに戻る
      await page.goto('https://gamebox.pointtown.com/easygame/event#roulette', {
        waitUntil: 'networkidle2',
      })
      await sleep(2000)
    }

    context.logger.info('✅ ルーレットキャンペーン完了')
  } catch (error) {
    context.logger.error('❌ ルーレットキャンペーン実行エラー:', error as Error)
  }
}

/**
 * かんたんゲームボックスのミッション
 * ログインミッションとルーレットキャンペーンを実行する
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function easyGameMissions(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('🎯 easyGameMissions()')

  // ミッションページにアクセス
  await page.goto('https://gamebox.pointtown.com/easygame/event', {
    waitUntil: 'networkidle2',
  })

  // ログインミッションを実行
  await executeLoginMission(context, page)

  // ルーレットキャンペーンを実行（1日10回）
  await executeRouletteCampaign(context, page)
}
