import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'
import { startDaemon } from '../helpers/daemon'

test('Selection → Event Creation', async () => {
  const daemon = await startDaemon(8765, { healthy: true })
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
  await page.waitForTimeout(3000)
  expect(daemon.received.length).toBeGreaterThan(0)
  const evt = daemon.received[0]
  expect(evt.headers['x-vyaso-local-client']).toBe('browser-extension')
  expect(evt.body.event_id).toBeTruthy()
  expect(evt.body.content_hash).toBeTruthy()
  await context.close()
  await daemon.close()
})