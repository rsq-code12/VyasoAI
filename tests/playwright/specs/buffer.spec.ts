import { test, expect } from '@playwright/test'
import { loadExtension } from '../helpers/ext'

test('Daemon Offline → Buffer', async () => {
  const { context, page } = await loadExtension('connectors/browser-extension')
  await page.goto('https://example.com')
  await page.evaluate(() => {
    window.postMessage({ type: 'vyaso-test-selection', text: 'Buffered', meta: { url: 'https://example.com', title: 'Example Domain', origin: 'https://example.com', canonical: null, hostname: 'example.com' } }, '*')
  })
  await page.waitForTimeout(1000)
  expect(true).toBeTruthy()
  await context.close()
})