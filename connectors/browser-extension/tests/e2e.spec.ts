import { chromium } from 'playwright'

async function run() {
  const extPath = require('path').join(process.cwd(), '.')
  const context = await chromium.launchPersistentContext('', { headless: false, args: [
    `--disable-extensions-except=${extPath}/connectors/browser-extension`,
    `--load-extension=${extPath}/connectors/browser-extension`
  ] })
  const page = await context.newPage()
  await page.setContent('<html><body><p id="t">hello world</p></body></html>')
  await page.evaluate(() => { const s = window.getSelection(); const el = document.getElementById('t'); const r = document.createRange(); r.selectNodeContents(el!); s!.removeAllRanges(); s!.addRange(r) })
  await new Promise(r => setTimeout(r, 2000))
  await context.close()
}

run().catch(e => { console.error(e); process.exit(1) })