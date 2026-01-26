import type { Page } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { isExistsSelector } from '@/utils/functions'
import fs from 'node:fs'

/**
 * ポイントQ
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function pointQ(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('pointQ()')
  await page.goto('https://www.pointtown.com/pointq/input', {
    waitUntil: 'networkidle2',
  })
  if (!(await isExistsSelector(page, 'form#js-quiz-form h3'))) {
    context.logger.info('Already pointQ')
    return
  }

  while (true) {
    const question = await page.evaluate(
      () => document.querySelector('form#js-quiz-form h3')?.textContent
    )
    if (question == null) {
      context.logger.error('question not found.')
      return
    }
    context.logger.info(`question: ${question}`)
    const labels = await page.$$('form#js-quiz-form li.pointq-radio-item label')
    const json: Record<string, string | undefined> = fs.existsSync(
      '/data/pointq.json'
    )
      ? JSON.parse(fs.readFileSync(`/data/pointq.json`, 'utf8'))
      : {}
    if (json[question] === undefined) {
      context.logger.info(`dont know answer...`)
      let index
      if (labels.length > 0) {
        index = Math.floor(Math.random() * labels.length)
        await labels[index].click()
      }
    } else {
      const answer = json[question]
      context.logger.info(`know answer: ${answer}`)
      let choicebool = false
      for (const [l, label] of labels.entries()) {
        const choice = await page.evaluate((label) => label.textContent, label)
        context.logger.info(`choice ${l}: ${choice}`)
        if (choice === answer) {
          context.logger.info(`this!`)
          await label.click()
          choicebool = true
          break
        }
      }
      if (!choicebool) {
        context.logger.info(`choice error...`)
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete json[question]
        let index
        if (labels.length > 0) {
          index = Math.floor(Math.random() * labels.length)
          await labels[index].click()
        }
      }
    }

    // 回答ボタンをクリックし、結果ページへの遷移を待機（タイムアウト時はページを直接読み込み）
    try {
      await Promise.all([
        page
          .waitForSelector('button#js-pointq-submit', {
            visible: true,
            timeout: 10_000,
          })
          .then((element) => element?.click()),
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }),
      ])
    } catch (error) {
      if ((error as Error).name === 'TimeoutError') {
        context.logger.warn(
          '結果ページへの遷移がタイムアウト、ページを直接読み込み'
        )
        await page.goto('https://www.pointtown.com/pointq/result', {
          waitUntil: 'networkidle2',
        })
      } else {
        throw error
      }
    }

    // 結果ページの正解表示を待機（タイムアウトを 60 秒に設定）
    await page.waitForSelector('p.pointq-correct-answer', {
      timeout: 60_000,
    })
    const trueanswer = await page.evaluate(() => {
      const text =
        document.querySelector('p.pointq-correct-answer')?.textContent ?? ''
      const segments = text.split('：')
      return segments.length > 1 ? segments[1] : ''
    })
    context.logger.info(`trueanswer: ${trueanswer}`)
    json[question] = trueanswer
    fs.writeFileSync(`/data/pointq.json`, JSON.stringify(json))

    // 次の問題への遷移（タイムアウト時はページを直接リロード）
    if (await isExistsSelector(page, 'a[href="/pointq/input"]')) {
      try {
        await Promise.all([
          page
            .waitForSelector('a[href="/pointq/input"]')
            .then((element) => element?.click()),
          page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          }),
        ])
      } catch (error) {
        if ((error as Error).name === 'TimeoutError') {
          context.logger.warn(
            '次の問題への遷移がタイムアウト、ページを直接読み込み'
          )
          await page.goto('https://www.pointtown.com/pointq/input', {
            waitUntil: 'networkidle2',
          })
        } else {
          throw error
        }
      }
    } else if (await isExistsSelector(page, 'div.rewardResumebutton')) {
      try {
        await Promise.all([
          page
            .waitForSelector('div.rewardResumebutton')
            .then((element) => element?.click()),
          page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          }),
        ])
      } catch (error) {
        if ((error as Error).name === 'TimeoutError') {
          context.logger.warn(
            '次の問題への遷移がタイムアウト、ページを直接読み込み'
          )
          await page.goto('https://www.pointtown.com/pointq/input', {
            waitUntil: 'networkidle2',
          })
        } else {
          throw error
        }
      }
    } else {
      return
    }
  }
}
