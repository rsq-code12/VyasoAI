import { ReactNode, MutableRefObject, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Search, Bot, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import CaptureTogglePill from '../shared/CaptureTogglePill'
import { useCapture } from '../../state/capture'

const navItems = [
  { path: '/timeline', label: 'Timeline', icon: Clock },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/copilot', label: 'Copilot', icon: Bot },
  { path: '/settings', label: 'Settings', icon: Settings }
]

export function AppShell({ children, searchRef }:{ children:ReactNode, searchRef: MutableRefObject<HTMLInputElement | null> }){
  const [collapsed, setCollapsed] = useState(false)
  const { isPaused } = useCapture()
  const loc = useLocation()
  
  return (
    <div className="h-screen flex bg-gradient-to-br from-bg-900 via-bg-900 to-surface/20">
      <motion.aside 
        className={`bg-surface/80 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-black/30`}
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 className="text-white font-bold text-lg bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                      VyasoAI
                    </h1>
                    <p className="text-white/60 text-xs font-medium">Memory Companion</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = loc.pathname === item.path
              
              return (
                <motion.div 
                  key={item.path} 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link 
                    to={item.path}
                    className={`
                      flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                      ${isActive 
                        ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-transparent text-primary border border-primary/30 shadow-lg shadow-primary/20' 
                        : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                      }
                    `}
                  >
                    <div className={`
                      absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      ${isActive ? 'opacity-100' : ''}
                    `} />
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${isActive ? 'text-primary' : 'group-hover:text-white'}`} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="font-semibold relative z-10"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              )
            })}
          </nav>
          
          <div className="p-4 border-t border-white/10">
            <motion.button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all duration-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: collapsed ? 0 : 180 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.aside>
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center gap-6 px-8 border-b border-white/10 bg-surface/30 backdrop-blur-xl">
          <motion.div 
            className="flex-1 relative group"
            whileFocus={{ scale: 1.01 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors duration-200" />
            </div>
            <input 
              ref={searchRef} 
              aria-label="Global search" 
              placeholder="Search your memories..." 
              className="
                w-full h-14 pl-12 pr-6 bg-surface/60 border border-white/10 rounded-2xl 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 
                focus:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20
                hover:bg-surface/70 hover:border-white/20 focus:bg-surface/80
              " 
            />
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CaptureTogglePill />
            <motion.div 
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10"
                whileHover={{ 
                  boxShadow: '0 0 20px rgba(50, 240, 140, 0.3), 0 0 40px rgba(50, 240, 140, 0.1)',
                  scale: 1.1
                }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-primary font-bold text-sm">U</span>
              </motion.div>
              <div>
                <p className="text-white font-semibold text-sm">User</p>
                <p className="text-white/60 text-xs">Active</p>
              </div>
            </motion.div>
          </motion.div>
        </header>
        
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm px-8 py-4"
            >
              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-yellow-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <div>
                  <p className="font-semibold">Capture Paused</p>
                  <p className="text-yellow-400/80 text-xs">No new memories are being recorded</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <section className="flex-1 overflow-auto bg-gradient-to-br from-bg-900 via-bg-900 to-surface/10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </section>
      </main>
    </div>
  )
}