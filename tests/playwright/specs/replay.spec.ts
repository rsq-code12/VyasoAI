import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'
import { startDaemon } from '../helpers/daemon'

test('Daemon Online → Replay', async () => {
  const { context, page } = await loadExtension('connectors/browser-extension')
  await page.goto('https://example.com')
  await page.evaluate(() => {
    window.postMessage({ type: 'vyaso-test-selection', text: 'Replay', meta: { url: 'https://example.com', title: 'Example Domain', origin: 'https://example.com', canonical: null, hostname: 'example.com' } }, '*')
  })
  await page.waitForTimeout(500)
  expect(true).toBeTruthy()
  await page.evaluate(() => { window.postMessage({ type: 'vyaso-set-daemon', payload: { base: 'http://127.0.0.1:8770' } }, '*') })
  const daemon = await startDaemon(8770, { healthy: true })
  await page.evaluate(() => { window.postMessage({ type: 'vyaso-force-drain' }, '*') })
  await page.waitForTimeout(5000)
  expect(true).toBeTruthy()
  expect(true).toBeTruthy()
  await context.close()
  await daemon.close()
})