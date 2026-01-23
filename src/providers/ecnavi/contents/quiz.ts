import type { Page } from 'rebrowser-puppeteer-core'
import type { EcNaviContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * 超難問クイズ王
 * 2 問連続正解でポイント獲得
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function quiz(context: EcNaviContext, page: Page): Promise<void> {
  context.logger.info('quiz()')

  await page.goto('https://ecnavi.jp/contents/quiz/', {
    waitUntil: 'networkidle2',
  })

  // 超難問クイズ王: 2問連続正解でポイント獲得
  for (let questionNumber = 1; questionNumber <= 2; questionNumber++) {
    context.logger.info(`question ${questionNumber}`)

    if (!(await isExistsSelector(page, 'p.todays-quiz__text'))) {
      context.logger.info('no question found')
      return
    }

    const questionElement = await page.$('p.todays-quiz__text')
    const question = await page.evaluate(
      (element) => element?.textContent,
      questionElement
    )
    context.logger.info(`question: ${question}`)
    if (!question) {
      return
    }

    const hintElement = await page.$('a.king-of-quiz__button')
    const hintUrl =
      (await page.evaluate((element) => element?.href ?? null, hintElement)) ??
      'about:blank'
    context.logger.info(`hint: ${hintUrl}`)
    const hintPage = await page.browser().newPage()
    let hint = ''
    try {
      await hintPage.goto(hintUrl, {
        waitUntil: 'networkidle2',
      })
      hint = await hintPage.evaluate((): string => {
        const body = document.querySelector('body')
        return body?.textContent ?? ''
      })
    } finally {
      await hintPage.close().catch(() => {
        // ページクローズ時のエラーは無視
      })
    }

    const answers = await page.$$('ul.choices__list button')
    let isFoundAnswer = false
    for (const answer of answers) {
      const text = await page.evaluate((element) => element.textContent, answer)
      if (!text) {
        continue
      }
      context.logger.info(`answer: ${text}`)
      if (hint.includes(text)) {
        isFoundAnswer = true
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {
            // ナビゲーションがタイムアウトした場合は無視
          }),
          answer.click(),
        ])
        break
      }
    }
    if (!isFoundAnswer) {
      if (answers.length === 0) {
        context.logger.warn('no answer buttons found')
        return
      }
      context.logger.info('not found answer, selecting random')
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {
          // ナビゲーションがタイムアウトした場合は無視
        }),
        answers[Math.floor(Math.random() * answers.length)].click(),
      ])
    }

    await sleep(2000)
  }
}
