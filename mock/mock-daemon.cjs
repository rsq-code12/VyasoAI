const http = require('http')

function startMockDaemon(opts = {}) {
  const port = opts.port || 8765
  let healthy = opts.healthy ?? true
  let failAfter = opts.failAfter || 0
  let delayMs = opts.delayMs || 0
  let dropFirstN = opts.dropFirstN || 0
  const received = []
  const dedupe = new Set()

  const server = http.createServer((req, res) => {
    if (delayMs) {
      const start = Date.now()
      while (Date.now() - start < delayMs) {}
    }
    if (req.url === '/v1/health') {
      res.writeHead(healthy ? 200 : 500)
      res.end('ok')
      return
    }
    if (req.url === '/v1/events' && req.method === 'POST') {
      if (dropFirstN > 0) { dropFirstN--; req.socket.destroy(); return }
      if (failAfter > 0 && received.length >= failAfter) { req.socket.destroy(); return }
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        let payload
        try { payload = JSON.parse(body) } catch { payload = null }
        received.push({ headers: req.headers, body: payload })
        const key = payload ? (payload.event_id || payload.content_hash) : undefined
        const isDup = key && dedupe.has(key)
        if (key && !isDup) dedupe.add(key)
        res.writeHead(isDup ? 200 : 202)
        res.end('accepted')
      })
      return
    }
    res.writeHead(404); res.end()
  })

  const start = () => new Promise(resolve => server.listen(port, resolve))
  const close = () => new Promise(resolve => server.close(resolve))
  const api = {
    start,
    close,
    setHealthy: (h) => { healthy = h },
    setFailAfter: (n) => { failAfter = n },
    setDelay: (ms) => { delayMs = ms },
    setDropFirstN: (n) => { dropFirstN = n },
    received
  }
  return api
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const opts = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--port') opts.port = parseInt(args[++i], 10)
    else if (a === '--healthy') opts.healthy = true
    else if (a === '--unhealthy') opts.healthy = false
    else if (a === '--fail-after') opts.failAfter = parseInt(args[++i], 10)
    else if (a === '--delay-ms') opts.delayMs = parseInt(args[++i], 10)
    else if (a === '--drop-first-n') opts.dropFirstN = parseInt(args[++i], 10)
  }
  const srv = startMockDaemon(opts)
  srv.start().then(() => {
    process.stdout.write(`mock-daemon listening on ${opts.port || 8765}\n`)
  })
  process.on('SIGINT', () => { srv.close().then(() => process.exit(0)) })
}

module.exports = { startMockDaemon }