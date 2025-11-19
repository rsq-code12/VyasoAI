import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from './components/AppShell/AppShell'
import { CaptureProvider } from './state/capture'
import TimelinePage from './pages/timeline'
import SearchPage from './pages/search'
import CopilotPage from './pages/copilot'
import SettingsPage from './pages/settings'
import { useCapture } from './state/capture'

export default function App(){
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement|null>(null)
  useEffect(()=>{
    const onKey = (e: KeyboardEvent)=>{
      const isMac = navigator.platform.toLowerCase().includes('mac')
      if ((isMac && e.metaKey && e.key.toLowerCase()==='k') || (!isMac && e.ctrlKey && e.key.toLowerCase()==='k')){
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === '.') navigate('/copilot')
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [navigate])

  const CaptureKeyListener = () => {
    const { toggle } = useCapture()
    useEffect(()=>{
      const onKey = (e: KeyboardEvent)=>{
        const isMac = navigator.platform.toLowerCase().includes('mac')
        if ((isMac && e.metaKey && e.shiftKey && e.key.toLowerCase()==='c') || (!isMac && e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='c')){
          e.preventDefault()
          toggle()
        }
      }
      window.addEventListener('keydown', onKey)
      return ()=> window.removeEventListener('keydown', onKey)
    }, [toggle])
    return null
  }

  return (
    <CaptureProvider>
    <CaptureKeyListener />
    <AppShell searchRef={searchRef}>
      <Routes>
        <Route path="/" element={<Navigate to="/timeline" replace />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
    </CaptureProvider>
  )
}