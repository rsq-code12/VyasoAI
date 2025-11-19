import { useState } from 'react'

import { Shield, Cloud, Palette, Database, Plus, Trash2, Save } from 'lucide-react'
import Button from '../ui/Button'
import { tauri } from '../../lib/tauri'
import { useCapture } from '../../state/capture'
import CaptureTogglePill from '../shared/CaptureTogglePill'

export default function Settings(){
  const { isPaused } = useCapture()
  const [cloud, setCloud] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable')
  const [exclusions, setExclusions] = useState<{ process:string, glob:string }[]>([])
  const [pendingEx, setPendingEx] = useState({ process:'', glob:'' })
  const [confirmPurge, setConfirmPurge] = useState('')
  const [retention, setRetention] = useState(false)
  const [purgeSource, setPurgeSource] = useState<'all'|'app'|'browser'|'file'|'email'>('all')
  const [purgeRange, setPurgeRange] = useState<'24h'|'7d'|'30d'|'all'>('all')
  const save = ()=>{}
  const addExclusion = ()=>{
    if (!pendingEx.process || !pendingEx.glob) return
    setExclusions(xs=> [...xs, pendingEx])
    setPendingEx({ process:'', glob:'' })
  }
  
  const SettingCard = ({ title, icon: Icon, children }:{ title:string, icon:any, children:React.ReactNode }) => (
    <section
      className="bg-surface border border-white/10 rounded-2xl p-8 shadow-soft"
    >
      <div className="flex items-center gap-4 mb-8">
        <div 
          className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30"
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-white text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{title}</h2>
      </div>
      {children}
    </section>
  )
  
  const Toggle = ({ checked, onChange }:{ checked:boolean, onChange:(checked:boolean)=>void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full transition-colors
        ${checked ? 'bg-primary' : 'bg-white/20'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
  
  return (
    <div className="space-y-8 max-w-4xl mx-auto px-8 py-8">
      <div 
        className="text-center mb-12"
      >
        <h1 className="text-white text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
          Settings
        </h1>
        <p className="text-white/60 text-lg font-medium">
          Customize your VyasoAI experience
        </p>
      </div>
      <SettingCard title="Privacy" icon={Shield}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium mb-1">Pause capture</h3>
              <p className="text-white/60 text-sm">Stop recording new memories</p>
            </div>
            <CaptureTogglePill />
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-white font-medium mb-4">Exclusions</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  placeholder="Process name"
                  className="flex-1 h-14 px-6 bg-surface/60 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 hover:bg-surface/70 hover:border-white/20"
                  value={pendingEx.process}
                  onChange={e=> setPendingEx(p=> ({...p, process:e.target.value}))}
                />
                <input
                  placeholder="File pattern (e.g., *.log)"
                  className="flex-1 h-14 px-6 bg-surface/60 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 hover:bg-surface/70 hover:border-white/20"
                  value={pendingEx.glob}
                  onChange={e=> setPendingEx(p=> ({...p, glob:e.target.value}))}
                />
                <div>
                  <Button variant="primary" onClick={addExclusion} className="px-8 h-14 shadow-lg shadow-primary/20 hover:shadow-primary/30">
                    <Plus className="w-5 h-5" />
                    <span className="ml-2 font-semibold">Add</span>
                  </Button>
                </div>
              </div>
              
              {exclusions.length > 0 && (
                <div className="space-y-2">
                  {exclusions.map((x,i)=> (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-surface/30 rounded-xl border border-white/10"
                    >
                      <span className="text-white/80 text-sm font-mono">{x.process} — {x.glob}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExclusions(exclusions.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SettingCard>
      
      <SettingCard title="Sync" icon={Cloud}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium mb-1">Cloud LLM</h3>
            <p className="text-white/60 text-sm">Use cloud-based AI models</p>
          </div>
          <Toggle checked={cloud} onChange={setCloud} />
        </div>
      </SettingCard>
      
      <SettingCard title="Appearance" icon={Palette}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-white/80 text-sm font-medium mb-2 block">Theme</label>
            <select
              value={theme}
              onChange={e=> setTheme(e.target.value as any)}
              className="w-full h-14 px-6 bg-surface/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 hover:bg-surface/70 hover:border-white/20"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div>
            <label className="text-white/80 text-sm font-medium mb-2 block">Density</label>
            <select
              value={density}
              onChange={e=> setDensity(e.target.value as any)}
              className="w-full h-14 px-6 bg-surface/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 hover:bg-surface/70 hover:border-white/20"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
      </SettingCard>
      
      <SettingCard title="Data" icon={Database}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium mb-1">Retention window</h3>
              <p className="text-white/60 text-sm">Auto-delete old memories</p>
            </div>
            <Toggle checked={retention} onChange={setRetention} />
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-white font-medium mb-4">Data Management</h3>
            <div className="flex gap-4 mb-6">
              <Button variant="outline" className="px-6">
                Export Data
              </Button>
              <Button variant="outline" className="px-6">
                Import Data
              </Button>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white/80 font-medium">Delete All Data</h4>
              <div className="flex gap-4">
                <input
                  value={confirmPurge}
                  onChange={e=> setConfirmPurge(e.target.value)}
                  placeholder="Type PURGE to confirm"
                  className="flex-1 h-14 px-6 bg-surface/60 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono uppercase tracking-wider shadow-lg shadow-black/20 hover:bg-surface/70 hover:border-white/20 transition-all duration-300"
                />
                <div>
                  <Button
                    variant="destructive"
                    disabled={confirmPurge!=='PURGE'}
                    className="px-8 h-14 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                    size="lg"
                    onClick={()=> tauri.invoke('purge', { filters: {} })}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="ml-2 font-semibold">Purge</span>
                  </Button>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6 space-y-3">
                <h4 className="text-white/80 font-medium">Granular Purge</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">Source</span>
                    <select
                      value={purgeSource}
                      onChange={e=> setPurgeSource(e.target.value as any)}
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
                      value={purgeRange}
                      onChange={e=> setPurgeRange(e.target.value as any)}
                      className="h-10 px-3 bg-surface/60 border border-white/10 rounded-xl text-white"
                    >
                      <option value="all">All time</option>
                      <option value="24h">Last 24h</option>
                      <option value="7d">Last 7d</option>
                      <option value="30d">Last 30d</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={()=>{
                      const now = new Date()
                      let start: string|undefined
                      if (purgeRange==='24h') start = new Date(now.getTime() - 24*3600_000).toISOString()
                      if (purgeRange==='7d') start = new Date(now.getTime() - 7*24*3600_000).toISOString()
                      if (purgeRange==='30d') start = new Date(now.getTime() - 30*24*3600_000).toISOString()
                      tauri.invoke('purge', { filters: { source: purgeSource==='all'?undefined:purgeSource, start, end: undefined } })
                    }}
                    className="px-6"
                  >
                    Apply Purge
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SettingCard>
      
      <div className="flex justify-center">
        <div>
          <Button variant="primary" onClick={save} className="px-12 py-4 text-lg shadow-2xl shadow-primary/40 hover:shadow-primary/50">
            <Save className="w-6 h-6" />
            <span className="ml-3 font-bold">Save Changes</span>
          </Button>
        </div>
      </div>
    </div>
  )
}