import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'
import { startDaemon } from '../helpers/daemon'

test('Failure Simulation & Recovery (no duplicates)', async () => {
  const daemon = await startDaemon(8765, { healthy: true, dropFirstN: 1 })
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
  await page.waitForTimeout(4000)
  const keys = new Set(daemon.received.map(r => r.body.event_id || r.body.content_hash))
  expect(keys.size).toBe(daemon.received.length)
  await context.close()
  await daemon.close()
})