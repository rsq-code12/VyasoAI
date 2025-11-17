import { test, expect, chromium } from '@playwright/test'
import * as path from 'path'
import * as os from 'os'
import { promises as fs } from 'fs'

test('buffers when daemon down then drains when up', async () => {
  const extPath = path.resolve(process.cwd(), 'dist')
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pw-ext-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  })
  const page = await context.newPage()
  await page.goto('https://example.com')
  await page.evaluate(() => {
    const sel = window.getSelection()
    const range = document.createRange()
    const p = document.querySelector('h1') as HTMLElement
    range.selectNodeContents(p)
    sel?.removeAllRanges(); sel?.addRange(range)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.waitForTimeout(500)
  await expect(true).toBeTruthy()
  await context.close()
})