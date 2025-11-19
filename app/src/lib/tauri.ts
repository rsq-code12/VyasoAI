export type Memory = {
  id: string
  title: string
  snippet: string
  timestamp: string
  source: 'app' | 'browser' | 'file' | 'email'
  metadata?: Record<string, any>
}

export type Provenance = {
  docId: string
  score: number
  excerpt: string
  source: string
}

function randomSource(): Memory['source']{
  const s = ['app','browser','file','email'] as const
  return s[Math.floor(Math.random()*s.length)]
}

function genMemories(count=200): Memory[]{
  const now = Date.now()
  return Array.from({length: count}, (_,i)=>{
    const t = new Date(now - i*3600_000).toISOString()
    return { id: `mem-${i}`, title: `Memory ${i}`, snippet: `Snippet for memory ${i}`, timestamp: t, source: randomSource() }
  })
}

const MEMS = genMemories(300)

function mockRecentMemories(){
  return Promise.resolve(MEMS.slice(0, 200))
}

function highlight(text: string, q: string){
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx<0) return text
  return text.slice(0,idx)+`<mark>${text.slice(idx, idx+q.length)}</mark>`+text.slice(idx+q.length)
}

function mockSearch(query: string, filters?: { source?: 'all'|'app'|'browser'|'file'|'email', start?: string, end?: string }){
  const res = MEMS.filter(m=> m.title.toLowerCase().includes(query.toLowerCase()) || m.snippet.toLowerCase().includes(query.toLowerCase()))
    .filter(m=> {
      if (filters?.source && filters.source!=='all') return m.source===filters.source
      return true
    })
    .filter(m=> {
      const t = new Date(m.timestamp).getTime()
      const s = filters?.start ? new Date(filters.start).getTime() : -Infinity
      const e = filters?.end ? new Date(filters.end).getTime() : Infinity
      return t>=s && t<=e
    })
  const buckets = {
    Notes: res.filter(r=> r.source==='app'),
    Files: res.filter(r=> r.source==='file'),
    Web: res.filter(r=> r.source==='browser'),
    Email: res.filter(r=> r.source==='email')
  }
  return Promise.resolve({
    query,
    buckets: Object.entries(buckets).map(([k,v])=>({
      name: k,
      items: v.map(m=>({ ...m, snippet: highlight(m.snippet, query) }))
    }))
  })
}

function mockRagQuery(query: string){
  const prov: Provenance[] = Array.from({length:3}, (_,i)=>({ docId: `doc-${i}`, score: Math.round(Math.random()*100)/100, excerpt: `Excerpt related to ${query}`, source: `Notes — Meeting 2025-10-${10+i}` }))
  return Promise.resolve({
    message: `Mock response for ${query}`,
    provenance: prov,
    origin: 'LOCAL' as const
  })
}

export const tauri = {
  invoke: async (cmd: string, args?: any) => {
    if ((window as any).__TAURI__?.invoke) return (window as any).__TAURI__.invoke(cmd, args)
    switch(cmd){
      case 'get_recent_memories': return mockRecentMemories()
      case 'search_memories': return mockSearch(args?.query ?? '', args?.filters)
      case 'rag_query': return mockRagQuery(args?.query ?? '')
      case 'purge': return mockPurge(args?.filters)
      default: return Promise.reject(new Error('Unknown command'))
    }
  }
}
function mockPurge(filters?: { source?: 'app'|'browser'|'file'|'email', start?: string, end?: string }){
  return Promise.resolve({ ok: true })
}