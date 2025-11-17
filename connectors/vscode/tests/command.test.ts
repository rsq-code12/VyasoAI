import * as path from 'path'
import { putEvent, getAll } from '../src/buffer.ts'

async function run() {
  const dir = path.join(process.cwd(), 'tmp-vscode-buffer-test')
  const envelope = { event_id: 'x1' }
  await putEvent(dir, { id: envelope.event_id, body: envelope, attempts: 0, lastAttempt: Date.now(), nextDue: Date.now() })
  const items = await getAll(dir)
  if (!items.length) throw new Error('buffer missing')
  console.log('ok')
}

run().catch(e => { console.error(e); process.exit(1) })