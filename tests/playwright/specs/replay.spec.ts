import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'
import { inspectIndexedDB } from '../helpers/indexeddb'
import { startDaemon } from '../helpers/daemon'

test('Daemon Online → Replay', async () => {
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
  await page.waitForTimeout(500)
  const before = await inspectIndexedDB(page, 'vyasoai-buffer', 'events')
  expect(before.length).toBeGreaterThan(0)
  const daemon = await startDaemon(8765, { healthy: true })
  await page.waitForTimeout(3000)
  const after = await inspectIndexedDB(page, 'vyasoai-buffer', 'events')
  expect(after.length).toBe(0)
  expect(daemon.received.length).toBeGreaterThan(0)
  await context.close()
  await daemon.close()
})