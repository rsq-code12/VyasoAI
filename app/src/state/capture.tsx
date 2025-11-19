import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'

type CaptureContextValue = {
  isPaused: boolean
  pause: () => void
  resume: () => void
  toggle: () => void
}

const CaptureContext = createContext<CaptureContextValue | null>(null)

export function CaptureProvider({ children }:{ children: ReactNode }){
  const [isPaused, setIsPaused] = useState<boolean>(false)

  const post = useCallback(async (path: string)=>{
    try {
      await fetch(`http://127.0.0.1:8777/v1/${path}`, { method: 'POST' })
    } catch {}
  }, [])

  const pause = useCallback(()=>{
    setIsPaused(true)
    post('pause')
  }, [post])

  const resume = useCallback(()=>{
    setIsPaused(false)
    post('resume')
  }, [post])

  const toggle = useCallback(()=>{
    if (isPaused) {
      resume()
    } else {
      pause()
    }
  }, [isPaused, pause, resume])

  const value = useMemo(()=>({ isPaused, pause, resume, toggle }), [isPaused, pause, resume, toggle])
  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
}

export function useCapture(){
  const ctx = useContext(CaptureContext)
  if (!ctx) throw new Error('useCapture must be used within CaptureProvider')
  return ctx
}