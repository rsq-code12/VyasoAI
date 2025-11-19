import { useEffect, useRef, useState } from 'react'
import { tauri, Memory } from '../../lib/tauri'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Clock, ArrowRight, Sparkles } from 'lucide-react'
import Button from '../ui/Button'

type Bucket = { name: string, items: (Memory & { snippet: string })[] }

const EmptyState = () => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="text-center py-24"
  >
    <motion.div 
      className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/30 mb-8 shadow-2xl shadow-primary/20"
      whileHover={{ 
        scale: 1.05, 
        boxShadow: '0 0 40px rgba(50, 240, 140, 0.3), 0 0 80px rgba(50, 240, 140, 0.1)'
      }}
      transition={{ duration: 0.3 }}
    >
      <Search className="w-10 h-10 text-primary" />
    </motion.div>
    <motion.h3 
      className="text-white text-2xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      Search your memories
    </motion.h3>
    <motion.p 
      className="text-white/60 text-lg max-w-lg mx-auto leading-relaxed"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      Type to search through your captured memories, code snippets, and conversations. 
      Use <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono border border-white/20">↑</kbd> <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono border border-white/20">↓</kbd> to navigate results.
    </motion.p>
  </motion.div>
)

export default function GlobalSearch(){
  const [query, setQuery] = useState('')
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const listRef = useRef<HTMLDivElement>(null)
  const [source, setSource] = useState<'all'|'app'|'browser'|'file'|'email'>('all')
  const [range, setRange] = useState<'24h'|'7d'|'30d'|'all'>('all')
  
  useEffect(()=>{ 
    const t = setTimeout(()=>{ 
      if (query) {
        const now = new Date()
        let start: string|undefined
        if (range==='24h') start = new Date(now.getTime() - 24*3600_000).toISOString()
        if (range==='7d') start = new Date(now.getTime() - 7*24*3600_000).toISOString()
        if (range==='30d') start = new Date(now.getTime() - 30*24*3600_000).toISOString()
        tauri.invoke('search_memories', { query, filters: { source, start, end: undefined } }).then((r:any)=> setBuckets(r.buckets))
      } else {
        setBuckets([])
      }
    }, 150)
    return ()=> clearTimeout(t) 
  },[query, source, range])
  
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      const flat = buckets.flatMap(b=> b.items)
      if (!flat.length) return
      if (e.key==='ArrowDown'){ 
        e.preventDefault(); 
        setActiveIndex(i=> Math.min(i+1, flat.length-1)) 
      }
      if (e.key==='ArrowUp'){ 
        e.preventDefault(); 
        setActiveIndex(i=> Math.max(i-1, 0)) 
      }
      if (e.key==='Enter'){ 
        e.preventDefault(); 
        const item = flat[activeIndex]; 
        if (item) window.location.hash = `open:${item.id}` 
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[buckets, activeIndex])
  
  const flat = buckets.flatMap(b=> b.items)
  
  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <motion.div 
        className="relative mb-12"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Search className="w-6 h-6 text-white/40 group-focus-within:text-primary transition-colors duration-300" />
        </div>
        <input 
          role="combobox" 
          aria-expanded={!!flat.length} 
          aria-controls="global-search-results" 
          aria-label="Search" 
          className="
            w-full h-16 pl-16 pr-8 bg-surface/60 backdrop-blur-xl border border-white/10 
            rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 
            focus:ring-primary/50 focus:border-primary/50 transition-all duration-300
            text-xl font-medium shadow-2xl shadow-black/30 hover:bg-surface/70 hover:border-white/20
            focus:bg-surface/80 focus:shadow-primary/20
          " 
          placeholder="Search your memories..." 
          value={query} 
          onChange={e=> setQuery(e.target.value)} 
        />
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Source</span>
            <select
              value={source}
              onChange={e=> setSource(e.target.value as any)}
              className="h-10 px-3 bg-surface/60 border border-white/10 rounded-xl text-white"
            >
              <option value="all">All</option>
              <option value="app">Notes</option>
              <option value="file">Files</option>
              <option value="browser">Web</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Time</span>
            <select
              value={range}
              onChange={e=> setRange(e.target.value as any)}
              className="h-10 px-3 bg-surface/60 border border-white/10 rounded-xl text-white"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </select>
          </div>
        </div>
        {query && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-6 top-1/2 transform -translate-y-1/2"
          >
            <motion.div 
              className="w-3 h-3 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </motion.div>
      
      <AnimatePresence mode="wait">
        {flat.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div 
            ref={listRef} 
            id="global-search-results" 
            role="listbox" 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {buckets.map((b,bi)=> (
              <motion.div 
                key={b.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bi * 0.15, duration: 0.5, ease: "easeOut" }}
                className="mb-8"
              >
                <motion.div 
                  className="flex items-center gap-3 mb-6 group cursor-pointer"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                  <h3 className="text-white/70 text-sm font-bold uppercase tracking-wider">
                    {b.name}
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                  <motion.span 
                    className="text-white/50 text-sm font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    {b.items.length}
                  </motion.span>
                </motion.div>
                
                <div className="grid gap-6">
                  {b.items.map((it, idx)=>{
                    const i = buckets.slice(0,bi).reduce((a,c)=> a+c.items.length,0) + idx
                    const active = i===activeIndex
                    
                    return (
                      <motion.div
                        key={it.id} 
                        role="option" 
                        aria-selected={active}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                      >
                        <div className={`
                          p-8 bg-surface/60 backdrop-blur-xl border rounded-2xl cursor-pointer group relative overflow-hidden
                          transition-all duration-300
                          ${active 
                            ? 'border-primary/50 ring-2 ring-primary/20 shadow-2xl shadow-primary/20 bg-surface/80' 
                            : 'border-white/10 hover:border-white/20 hover:bg-surface/80 hover:shadow-xl hover:shadow-black/30'
                          }
                        `}>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          <div className="flex items-start justify-between mb-4 relative z-10">
                            <h4 className={`text-xl font-bold flex-1 transition-colors duration-300 ${active ? 'text-primary' : 'text-white group-hover:text-white'}`}>
                              {it.title}
                            </h4>
                            {active && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ArrowRight className="w-5 h-5 text-primary" />
                              </motion.div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm mb-4 relative z-10">
                            <div className={`flex items-center gap-2 transition-colors duration-300 ${active ? 'text-primary/80' : 'text-white/50 group-hover:text-white/70'}`}>
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{new Date(it.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className={`flex items-center gap-2 transition-colors duration-300 ${active ? 'text-primary/80' : 'text-white/50 group-hover:text-white/70'}`}>
                              <FileText className="w-4 h-4" />
                              <span className="font-medium">{it.source}</span>
                            </div>
                          </div>
                          
                          <div 
                            className={`text-base leading-relaxed line-clamp-2 transition-colors duration-300 ${active ? 'text-white/80' : 'text-white/70 group-hover:text-white/80'}`} 
                            dangerouslySetInnerHTML={{ __html: it.snippet }} 
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}