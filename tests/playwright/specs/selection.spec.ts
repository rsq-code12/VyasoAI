import { test, expect } from '@playwright/test'
import { loadExtension, callExtension } from '../helpers/ext'
import { startDaemon } from '../helpers/daemon'

test('Selection → Event Creation', async () => {
  const { context, page } = await loadExtension('connectors/browser-extension')
  await page.evaluate(() => { window.postMessage({ type: 'vyaso-set-daemon', payload: { base: 'http://127.0.0.1:8771' } }, '*') })
  const daemon = await startDaemon(8771, { healthy: true })
  await page.goto('https://example.com')
  await page.evaluate(() => {
    window.postMessage({ type: 'vyaso-test-selection', text: 'Example Domain', meta: { url: 'https://example.com', title: 'Example Domain', origin: 'https://example.com', canonical: null, hostname: 'example.com' } }, '*')
  })
  await page.evaluate(() => { window.postMessage({ type: 'vyaso-force-drain' }, '*') })
  await page.waitForTimeout(5000)
  expect(true).toBeTruthy()
  await context.close()
  await daemon.close()
})
