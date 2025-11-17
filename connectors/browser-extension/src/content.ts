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