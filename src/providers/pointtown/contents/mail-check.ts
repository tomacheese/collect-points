import type { Page } from 'rebrowser-puppeteer-core'
import { KnownDevices } from 'rebrowser-puppeteer-core'
import type { PointTownContext } from '@/core/types'
import { isExistsSelector, sleep } from '@/utils/functions'

/**
 * ポイントメールボックス
 * @param context クローラーコンテキスト
 * @param page ページ
 */
export async function mailCheck(
  context: PointTownContext,
  page: Page
): Promise<void> {
  context.logger.info('mailCheck()')
  await page.goto('https://www.pointtown.com/ptu/mailbox', {
    waitUntil: 'networkidle2',
  })

  if (!(await isExistsSelector(page, 'ul.c-point-mail-table__row'))) {
    context.logger.info('"ul.c-point-mail-table__row" is not found')
    return
  }
  const mails = await page.$$('ul.c-point-mail-table__row')
  for (const a of mails) {
    if ((await a.$('p.c-coin-label')) == null) {
      context.logger.info('not point... continue!')
      continue
    }
    context.logger.info('point.')
    const title = await a.$('a.c-point-mail-table__l-title')
    if (title == null) {
      context.logger.error('title not found.')
      continue
    }

    const href = await page.evaluate((element) => element.href, title)
    if (!href) {
      context.logger.error('url not found.')
      continue
    }
    const regex = /\/mypage\/mail\/(\d+)/
    const match = regex.exec(href)
    if (match == null) {
      context.logger.error('match not found.')
      continue
    }
    const mailId = match[1]
    context.logger.info(`Mail ID: ${mailId}`)

    const newPage = await page.browser().newPage()
    await newPage.goto(`https://www.pointtown.com/mypage/mail/body/${mailId}`, {
      waitUntil: 'networkidle2',
    })
    const text = await newPage.evaluate(() => {
      return document.body.innerHTML
    })

    const patterns = [
      /\[Point] ?(https?:\/\/.+)/,
      /href="(https:\/\/www\.pointtown\.com\/mail\/click.+?)"/,
    ]
    const matches = patterns
      .map((pattern) => text.match(pattern))
      .find((x) => x != null)

    if (matches == null) {
      context.logger.info('matches not found.')
      await newPage.close()
      continue
    }

    const url = matches[1].replaceAll('&amp;', '&')
    if (url === '') {
      context.logger.info('url not found.')
      await newPage.close()
      continue
    }
    context.logger.info(`Url: ${url}`)
    const newPage2 = await page.browser().newPage()
    await newPage2.emulate(KnownDevices['iPhone 13 Pro'])
    await newPage2.goto(url, { waitUntil: 'networkidle2' })
    await newPage2
      .waitForSelector('label.itp-form__label', {
        timeout: 10_000,
      })
      .then((element) => element?.click())
      .catch(() => null)
    await newPage2
      .waitForSelector('button.btn-default', {
        timeout: 3000,
      })
      .then((element) => element?.click())
      .catch(() => null)
    await sleep(10_000)
    await newPage2.close()
    await newPage.close()
  }
}
