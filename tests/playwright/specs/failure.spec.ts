import { test, expect } from '@playwright/test'
import { loadExtension, callExtension } from '../helpers/ext'
import { startDaemon } from '../helpers/daemon'

test('Failure Simulation & Recovery (no duplicates)', async () => {
  const daemon = await startDaemon(8765, { healthy: true, dropFirstN: 1 })
  const { context, page } = await loadExtension('connectors/browser-extension')
  await page.goto('https://example.com')
  await page.evaluate(() => {
    window.postMessage({ type: 'vyaso-test-selection', text: 'FailureCase', meta: { url: 'https://example.com', title: 'Example Domain', origin: 'https://example.com', canonical: null, hostname: 'example.com' } }, '*')
  })
  await page.waitForTimeout(4000)
  const keys = new Set(daemon.received.map(r => r.body.event_id || r.body.content_hash))
  expect(keys.size).toBe(daemon.received.length)
  await context.close()
  await daemon.close()
})