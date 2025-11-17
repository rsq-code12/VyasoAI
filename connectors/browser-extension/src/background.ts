import { putEvent, getAll, deleteEvent, updateEvent, BufferedEvent } from './db'

let DAEMON_BASE = 'http://127.0.0.1:8765'

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  const arr = Array.from(new Uint8Array(digest))
  return arr.map(b => b.toString(16).padStart(2, '0')).join('')
}

function nowRfc3339(): string {
  return new Date().toISOString()
}

async function postEnvelope(body: any): Promise<boolean> {
  try {
    const resp = await fetch(`${DAEMON_BASE}/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Vyaso-Local-Client': 'browser-extension' },
      body: JSON.stringify(body)
    })
    return resp.status === 202
  } catch {
    return false
  }
}

async function healthOk(): Promise<boolean> {
  try {
    const resp = await fetch(`${DAEMON_BASE}/v1/health`, {
      method: 'GET',
      headers: { 'X-Vyaso-Local-Client': 'browser-extension' }
    })
    return resp.ok
  } catch {
    return false
  }
}

const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 60000
const SCHED_TICK_MS = 1000
const HEALTH_COOLDOWN_MS = 5000

function computeBackoffMs(attempts: number): number {
  const base = Math.min(RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts)), RETRY_MAX_MS)
  const jitter = 0.5 + Math.random() // 0.5x..1.5x
  return Math.floor(base * jitter)
}

async function handleSelection(text: string, meta: any) {
  if (!text) return
  const event_id = crypto.randomUUID()
  const content_hash = await sha256Hex(text)
  const envelope = {
    event_id,
    timestamp: nowRfc3339(),
    source: 'browser-extension',
    app: navigator.userAgent.includes('Firefox') ? 'firefox' : 'chrome',
    content_pointer: '',
    content_hash,
    size_bytes: new TextEncoder().encode(text).length,
    tags: [meta?.hostname, meta?.origin, meta?.url, meta?.title, meta?.canonical].filter(Boolean),
    privacy_flag: 'default'
  }
  const ok = await postEnvelope(envelope)
  if (!ok) {
    const now = Date.now()
    await putEvent({ id: event_id, body: envelope, attempts: 0, lastAttempt: now, nextDue: now + computeBackoffMs(0) })
  }
}

let lastHealth = 0
let cachedHealthy = false
async function retryBuffer() {
  const now = Date.now()
  if (now - lastHealth >= HEALTH_COOLDOWN_MS) {
    cachedHealthy = await healthOk()
    lastHealth = now
  }
  if (!cachedHealthy) return
  const items = await getAll()
  const due = items.filter((it: BufferedEvent) => (it.nextDue ?? 0) <= now)
  for (const it of due) {
    const ok = await postEnvelope(it.body)
    if (ok) {
      await deleteEvent(it.id)
    } else {
      const attempts = (it.attempts || 0) + 1
      const delay = computeBackoffMs(attempts)
      it.attempts = attempts
      it.lastAttempt = now
      it.nextDue = now + delay
      await updateEvent(it)
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {})

chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg && msg.type === 'vyaso-selection') {
    handleSelection(msg.text, msg.meta)
  }
})

chrome.runtime.onMessage.addListener((msg: any, _sender: any, sendResponse: (resp: any) => void) => {
  if (msg && msg.type === 'vyaso-dump-buffer') {
    getAll().then(items => sendResponse(items)).catch(() => sendResponse([]))
    return true
  }
  if (msg && msg.type === 'vyaso-force-drain') {
    retryBuffer().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }
  if (msg && msg.type === 'vyaso-test-selection') {
    const p = msg.payload || {}
    handleSelection(p.text || '', p.meta || {})
    sendResponse({ ok: true })
    return true
  }
  if (msg && msg.type === 'vyaso-set-daemon') {
    const base = msg.payload?.base
    if (typeof base === 'string' && base.startsWith('http')) DAEMON_BASE = base
    sendResponse({ ok: true, base: DAEMON_BASE })
    return true
  }
})

setInterval(() => { retryBuffer() }, SCHED_TICK_MS)