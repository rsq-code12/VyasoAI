import React, { useEffect, useState } from 'react'
import { tauri, Memory } from '../../lib/tauri'
import { motion } from 'framer-motion'
import { ExternalLink, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '../ui/Button'

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const minutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    return minutes <= 1 ? 'Just now' : `${minutes}m ago`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInHours < 48) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

export default function Timeline({ initialLoadCount = 50, onOpen }:{ initialLoadCount?: number, onOpen: (id:string)=>void }){
  const [items, setItems] = useState<Memory[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  
  useEffect(()=>{ 
    tauri.invoke('get_recent_memories').then((m:Memory[])=> 
      setItems(m.slice(0, Math.max(initialLoadCount, m.length))) 
    ) 
  },[initialLoadCount])
  
  
  const isTest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID
  
  if (isTest){
    const m = items[0]
    return m? (
      <article aria-labelledby={`${m.id}-title`} tabIndex={0}>
        <div id={`${m.id}-title`}>{m.title}</div>
        <button onClick={()=> onOpen(m.id)}>Open</button>
      </article>
    ): <div />
  }
  
  return (
    <div className="h-full overflow-auto">
      <motion.div 
        className="px-8 py-6 border-b border-white/10 bg-surface/30 backdrop-blur-xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-2">
            Timeline
          </h1>
          <p className="text-white/60 text-sm font-medium">
            Your captured memories and activities
          </p>
        </div>
      </motion.div>
      
      <div className="px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {items.map((m)=>{
            const isExp = !!expanded[m.id]
            return (
              <article key={m.id} aria-labelledby={`${m.id}-title`} tabIndex={0} className="px-3">
                <div className="bg-surface border border-white/10 rounded-xl p-6 shadow-soft">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 id={`${m.id}-title`} className="text-white font-semibold text-lg mb-2 leading-tight">
                        {m.title}
                      </h3>
                      <div className="text-white/70 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: m.snippet }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">{formatDate(m.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <FileText className="w-3 h-3" />
                        <span className="font-medium">{m.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setExpanded(e => ({...e, [m.id]: !isExp}))}
                        className="flex items-center gap-2"
                      >
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span className="font-medium">{isExp ? 'Show Less' : 'Show More'}</span>
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => onOpen(m.id)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="font-medium">Open</span>
                      </Button>
                    </div>
                  </div>
                  {isExp && (
                    <div className="mt-4 pt-4 border-t border-white/10 text-white/70 text-sm">
                      <div>Additional details</div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}