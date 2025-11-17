import { fallbackUnifiedDiff } from '../src/diff.ts'

function run() {
  const oldText = 'line1\nline2\n'
  const newText = 'line1\nlineX\n'
  const patch = fallbackUnifiedDiff('file.txt', oldText, newText)
  if (!patch.includes('@@')) throw new Error('no hunk header')
  console.log('ok')
}

run()