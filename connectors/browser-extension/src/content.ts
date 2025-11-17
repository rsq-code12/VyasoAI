function getSelectionText(): string {
  const sel = window.getSelection()
  return sel ? sel.toString() : ''
}

function getPageMeta() {
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  return {
    url: location.href,
    title: document.title,
    origin: location.origin,
    canonical: canonical?.href || null,
    hostname: location.hostname
  }
}

function sendSelection() {
  const text = getSelectionText()
  const meta = getPageMeta()
  chrome.runtime.sendMessage({ type: 'vyaso-selection', text, meta })
}

document.addEventListener('mouseup', () => {
  sendSelection()
})

window.addEventListener('message', (e) => {
  const d: any = e.data
  if (d && d.type === 'vyaso-test-selection') {
    chrome.runtime.sendMessage({ type: 'vyaso-selection', text: d.text, meta: d.meta })
  }
  if (d && d.type === 'vyaso-dump-buffer') {
    chrome.runtime.sendMessage({ type: 'vyaso-dump-buffer' }, (items: any) => {
      window.postMessage({ type: 'vyaso-dump-buffer-result', items }, '*')
    })
  }
  if (d && d.type === 'vyaso-force-drain') {
    chrome.runtime.sendMessage({ type: 'vyaso-force-drain' }, () => {
      window.postMessage({ type: 'vyaso-force-drain-done' }, '*')
    })
  }
})