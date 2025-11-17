import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'
import { inspectIndexedDB } from '../helpers/indexeddb'

test('Daemon Offline → Buffer', async () => {
  const { context, page } = await loadExtension('connectors/browser-extension')
  await page.goto('https://example.com')
  await page.evaluate(() => {
    const sel = window.getSelection()
    const range = document.createRange()
    const p = document.querySelector('h1') as HTMLElement
    range.selectNodeContents(p)
    sel?.removeAllRanges(); sel?.addRange(range)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.waitForTimeout(1000)
  const records = await inspectIndexedDB(page, 'vyasoai-buffer', 'events')
  expect(records.length).toBeGreaterThan(0)
  await context.close()
})