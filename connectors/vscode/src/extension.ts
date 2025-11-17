import * as vscode from 'vscode'
import { putEvent, getAll, updateEvent, deleteEvent, BufferedEvent } from './buffer'
import * as cryptoNode from 'crypto'
import * as path from 'path'
import { tryGitUnifiedDiff, fallbackUnifiedDiff, contentPreview } from './diff'

function nowRfc3339(): string { return new Date().toISOString() }

function sha256Hex(text: string): string {
  return cryptoNode.createHash('sha256').update(text, 'utf8').digest('hex')
}

async function postEnvelope(body: any): Promise<boolean> {
  try {
    const resp = await fetch('http://127.0.0.1:8765/v1/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vyaso-Local-Client': 'vscode' }, body: JSON.stringify(body)
    })
    return resp.status === 202
  } catch { return false }
}

async function healthOk(): Promise<boolean> {
  try {
    const resp = await fetch('http://127.0.0.1:8765/v1/health', {
      method: 'GET', headers: { 'X-Vyaso-Local-Client': 'vscode' }
    })
    return resp.ok
  } catch { return false }
}

const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 60000
const SCHED_TICK_MS = 1000
const HEALTH_COOLDOWN_MS = 5000

function computeBackoffMs(attempts: number): number {
  const base = Math.min(RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts)), RETRY_MAX_MS)
  const jitter = 0.5 + Math.random()
  return Math.floor(base * jitter)
}

async function bufferPush(ctx: vscode.ExtensionContext, body: any) {
  const now = Date.now()
  const ev: BufferedEvent = { id: body.event_id, body, attempts: 0, lastAttempt: now, nextDue: now + computeBackoffMs(0) }
  await putEvent(ctx.globalStorageUri.fsPath, ev)
}

let lastHealthCheck = 0
let cachedHealthy = false
async function retryBuffer(ctx: vscode.ExtensionContext) {
  const now = Date.now()
  if (now - lastHealthCheck >= HEALTH_COOLDOWN_MS) {
    cachedHealthy = await healthOk()
    lastHealthCheck = now
  }
  if (!cachedHealthy) return
  const items = await getAll(ctx.globalStorageUri.fsPath)
  const due = items.filter(it => (it.nextDue ?? 0) <= now)
  for (const it of due) {
    const ok = await postEnvelope(it.body)
    if (ok) {
      await deleteEvent(ctx.globalStorageUri.fsPath, it.id)
    } else {
      const attempts = (it.attempts || 0) + 1
      const delay = computeBackoffMs(attempts)
      it.attempts = attempts
      it.lastAttempt = now
      it.nextDue = now + delay
      await updateEvent(ctx.globalStorageUri.fsPath, it)
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const retry = setInterval(() => { retryBuffer(context) }, SCHED_TICK_MS)
  context.subscriptions.push({ dispose: () => clearInterval(retry) })

  const sendCmd = vscode.commands.registerCommand('vyaso.sendSelection', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return
    const sel = editor.document.getText(editor.selection)
    if (!sel) return
    const filePath = editor.document.uri.fsPath
    const event_id = crypto.randomUUID()
    const content_hash = sha256Hex(sel)
    const envelope = {
      event_id,
      timestamp: nowRfc3339(),
      source: 'vscode',
      app: 'vscode',
      content_pointer: filePath,
      content_hash,
      size_bytes: Buffer.byteLength(sel, 'utf8'),
      tags: ['selection', path.basename(filePath)],
      privacy_flag: 'default'
    }
    const ok = await postEnvelope(envelope)
    if (!ok) await bufferPush(context, envelope)
  })
  context.subscriptions.push(sendCmd)

  // Maintain previous content snapshot to compute diffs
  const previousContent = new Map<string, string>()
  vscode.workspace.onDidOpenTextDocument((doc) => { previousContent.set(doc.uri.fsPath, doc.getText()) })
  vscode.workspace.onDidChangeTextDocument((e) => { previousContent.set(e.document.uri.fsPath, e.document.getText()) })

  const saveHook = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const event_id = crypto.randomUUID()
    const content_hash = sha256Hex(doc.getText())
    const filePath = doc.uri.fsPath
    const oldText = previousContent.get(filePath) ?? ''
    const repoDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? path.dirname(filePath)
    const diff = tryGitUnifiedDiff(repoDir, filePath, oldText, doc.getText()) || fallbackUnifiedDiff(filePath, oldText, doc.getText())
    const envelope = {
      event_id,
      timestamp: nowRfc3339(),
      source: 'vscode',
      app: 'vscode',
      content_pointer: filePath,
      content_hash,
      size_bytes: Buffer.byteLength(doc.getText(), 'utf8'),
      tags: ['save', path.basename(doc.uri.fsPath)],
      privacy_flag: 'default',
      diff,
      content_preview: contentPreview(doc.getText())
    }
    const ok = await postEnvelope(envelope)
    if (!ok) await bufferPush(context, envelope)
  })
  context.subscriptions.push(saveHook)
}

export function deactivate() {}