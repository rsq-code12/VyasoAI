import { createHash } from 'crypto'

function computeBackoffMs(attempts: number): number {
  const RETRY_BASE_MS = 1000
  const RETRY_MAX_MS = 60000
  const base = Math.min(RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts)), RETRY_MAX_MS)
  const jitter = 0.5 + Math.random()
  return Math.floor(base * jitter)
}

function run() {
  const d0 = computeBackoffMs(0)
  if (d0 < 500 || d0 > 1500) throw new Error('attempt 0 out of range')
  const d3 = computeBackoffMs(3)
  if (d3 < 4000 || d3 > 12000) throw new Error('attempt 3 out of range')
  console.log('ok')
}

run()