import { useEffect, useRef, useState } from 'react'
import { tauri, Provenance } from '../../lib/tauri'
import { motion } from 'framer-motion'
import { Send, Bot, User, Globe, Server, ChevronDown } from 'lucide-react'
import Button from '../ui/Button'

type Msg = { id:string, role:'user'|'assistant', text:string, origin?:'LOCAL'|'CLOUD', provenance?:Provenance[] }

const renderMarkdown = (text: string)=>{
  const code = text.replace(/```([\s\S]*?)```/g, (_m, p1)=> `<pre class="bg-bg-900 text-white p-3 rounded-xl overflow-auto">${p1.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`)
  const bold = code.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>')
  const links = italic.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>')
  return links
}

const MessageBubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex gap-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-4 max-w-4xl ${isUser ? 'flex-row-reverse' : ''}`}>
        <motion.div 
          className={`
            w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg
            ${isUser 
              ? 'bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 text-primary border border-primary/30' 
              : 'bg-gradient-to-br from-white/15 via-white/10 to-white/5 text-white border border-white/20'
            }
          `}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </motion.div>
        
        <motion.div 
          className={`
            px-6 py-4 rounded-xl bg-surface relative overflow-hidden
            ${isUser 
              ? 'border border-primary/20 text-white' 
              : 'border border-white/10 text-white'
            }
          `}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-lg leading-relaxed font-medium relative z-10" dangerouslySetInnerHTML={{ __html: msg.role==='assistant' ? renderMarkdown(msg.text) : msg.text }} />
          
          {msg.role === 'assistant' && (
            <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {msg.origin === 'CLOUD' ? (
                    <div className="flex items-center gap-2 text-xs text-red-400/80 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      <Globe className="w-3 h-3" />
                      <span className="font-semibold">Cloud</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      <Server className="w-3 h-3" />
                      <span className="font-semibold">Local</span>
                    </div>
                  )}
                </div>
                
                {msg.provenance && msg.provenance.length > 0 && (
                  <details className="text-xs group">
                    <summary className="cursor-pointer text-white/60 hover:text-white transition-colors flex items-center gap-2">
                      <span className="font-semibold">Sources ({msg.provenance.length})</span>
                      <motion.div
                        animate={{ rotate: 0 }}
                        className="group-open:rotate-180 transition-transform duration-200"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </summary>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {msg.provenance.map(p=> (
                        <Button
                          key={p.docId}
                          variant="ghost"
                          size="sm"
                          onClick={()=> window.location.hash = `open:${p.docId}`}
                          className="text-xs font-medium"
                        >
                          {p.source}
                        </Button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function CopilotChat(){
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  
  useEffect(()=>{ 
    listRef.current?.scrollTo({ 
      top: listRef.current.scrollHeight, 
      behavior: 'smooth' 
    }) 
  },[msgs])
  
  const send = async ()=>{
    if (!input.trim()) return
    
    const q = input
    setInput('')
    setIsTyping(true)
    
    // Add user message
    setMsgs(m=> [...m, { 
      id: crypto.randomUUID(), 
      role: 'user', 
      text: q 
    }])
    
    try {
      const r:any = await tauri.invoke('rag_query', { query: q })
      setMsgs(m=> [...m, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        text: r.message, 
        origin: r.origin, 
        provenance: r.provenance 
      }])
    } catch (error) {
      setMsgs(m=> [...m, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        text: 'Sorry, I encountered an error while processing your request.' 
      }])
    } finally {
      setIsTyping(false)
    }
  }
  
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if (e.key==='Enter' && !e.shiftKey){ 
      e.preventDefault(); 
      send() 
    }
  }
  
  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <motion.div 
        className="px-8 py-6 border-b border-white/10 bg-surface/30 backdrop-blur-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30"
          >
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              AI Copilot
            </h1>
            <p className="text-white/60 text-sm font-medium">Your intelligent memory assistant</p>
          </div>
        </div>
      </motion.div>
      
      <div ref={listRef} className="flex-1 overflow-auto px-8 py-8 space-y-8">
        {msgs.map(m=> (
          <MessageBubble key={m.id} msg={m} />
        ))}
        
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 border border-white/20">
              <Bot className="w-5 h-5" />
            </div>
            <div className="px-6 py-4 rounded-xl bg-surface border border-white/15 text-white">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-white/10 p-8 bg-surface/30">
        <div className="flex gap-6 max-w-4xl mx-auto">
          <textarea 
            aria-label="Chat input" 
            placeholder="Ask the copilot anything..." 
            value={input} 
            onChange={e=> setInput(e.target.value)} 
            onKeyDown={onKey} 
            className="
              flex-1 h-20 bg-surface/60 border border-white/10 rounded-2xl 
              text-white placeholder-white/40 focus:outline-none focus:ring-2 
              focus:ring-primary/50 focus:border-primary/50 transition-all duration-300
              px-8 py-6 text-lg resize-none shadow-lg shadow-black/20
              hover:bg-surface/70 hover:border-white/20 focus:bg-surface/80
            "
            disabled={isTyping}
          />
          <div>
            <Button 
              variant="primary" 
              onClick={send}
              disabled={!input.trim() || isTyping}
              className="px-8 h-20"
              size="lg"
            >
              <Send className="w-5 h-5" />
              <span className="ml-2 font-semibold">Send</span>
            </Button>
          </div>
        </div>
        <p 
          className="text-center text-white/50 text-sm mt-4 max-w-4xl mx-auto"
        >
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono border border-white/20">Enter</kbd> to send, <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono border border-white/20">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}