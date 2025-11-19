import { useEffect, useMemo, useState } from 'react'
import { tauri, Memory, Provenance } from '../../lib/tauri'

export default function MemoryViewer({ memoryId }:{ memoryId: string }){
  const [memory, setMemory] = useState<Memory|null>(null)
  const [prov, setProv] = useState<Provenance[]>([])
  const [redaction, setRedaction] = useState('')
  const [tab, setTab] = useState<'content'|'diff'|'provenance'>('content')
  useEffect(()=>{
    tauri.invoke('get_recent_memories').then((m:Memory[])=> setMemory(m.find(x=> x.id===memoryId) ?? null))
  },[memoryId])
  useEffect(()=>{ if (memory) tauri.invoke('rag_query', { query: memory.title }).then((r:any)=> setProv(r.provenance)) },[memory])
  if (!memory) return <div className="text-muted">Loading…</div>
  const prevText = useMemo(()=> (memory?.metadata as any)?.previous ?? '', [memory])
  const diffHtml = useMemo(()=>{
    const a = String(prevText)
    const b = String(memory?.snippet ?? '')
    const al = a.split(/\s+/)
    const bl = b.split(/\s+/)
    let i=0,j=0, out=''
    while(i<al.length || j<bl.length){
      if (i<al.length && j<bl.length && al[i]===bl[j]){ out += al[i]+' '; i++; j++; continue }
      if (j<bl.length && !al.includes(bl[j])){ out += '<ins>'+bl[j]+'</ins> '; j++; continue }
      if (i<al.length && !bl.includes(al[i])){ out += '<del>'+al[i]+'</del> '; i++; continue }
      if (i<al.length){ out += '<del>'+al[i]+'</del> '; i++ }
      if (j<bl.length){ out += '<ins>'+bl[j]+'</ins> '; j++ }
    }
    return out.trim()
  },[prevText, memory])
  return (
    <div role="document" className="space-y-4">
      <div className="bg-bg-800 rounded-2xl p-4 shadow-soft">
        <div className="text-white text-xl">{memory.title}</div>
        <div className="text-muted text-sm">{new Date(memory.timestamp).toLocaleString()} • {memory.source}</div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={()=> setTab('content')} className={`px-3 py-1 rounded-xl ${tab==='content'?'bg-primary text-black':'bg-bg-900 text-white'}`}>Content</button>
          <button onClick={()=> setTab('diff')} className={`px-3 py-1 rounded-xl ${tab==='diff'?'bg-primary text-black':'bg-bg-900 text-white'}`}>Diff</button>
          <button onClick={()=> setTab('provenance')} className={`px-3 py-1 rounded-xl ${tab==='provenance'?'bg-primary text-black':'bg-bg-900 text-white'}`}>Provenance</button>
        </div>
        {tab==='content' && (
          <div className="mt-3 text-white" dangerouslySetInnerHTML={{ __html: memory.snippet }} />
        )}
        {tab==='diff' && (
          <div className="mt-3 text-white" dangerouslySetInnerHTML={{ __html: diffHtml }} />
        )}
        {tab==='provenance' && (
          <div className="mt-3 flex flex-col gap-2">
            {prov.map(p=> (
              <div key={p.docId} className="flex items-center justify-between bg-bg-900 rounded-xl px-3 py-2">
                <div className="text-white/80 text-sm">{p.source}</div>
                <button className="px-3 py-1 rounded-xl bg-primary text-black" onClick={()=> window.location.hash = `open:${memoryId}`}>Open</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="bg-bg-800 rounded-2xl p-4 shadow-soft">
        <summary className="cursor-pointer text-white">Provenance</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {prov.map(p=> (
            <button key={p.docId} className="px-3 py-2 rounded-xl bg-bg-900 text-white hover:bg-bg-800" onClick={()=> window.location.hash = `open:${memoryId}`}>{p.source}</button>
          ))}
        </div>
      </details>
      <div className="bg-bg-800 rounded-2xl p-4 shadow-soft">
        <div className="text-white font-semibold">Redact selection</div>
        <textarea className="mt-2 w-full h-24 rounded-xl bg-bg-900 text-white p-3" placeholder="Enter text to redact" value={redaction} onChange={e=> setRedaction(e.target.value)} />
        <button className="mt-2 px-4 py-2 rounded-xl bg-primary text-black">Redact</button>
      </div>
    </div>
  )
}