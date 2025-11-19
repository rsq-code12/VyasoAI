import { motion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { useCapture } from '../../state/capture'

export default function CaptureTogglePill(){
  const { isPaused, toggle } = useCapture()
  const label = isPaused ? 'Paused' : 'Capturing'
  const title = isPaused ? 'Resume capture' : 'Pause capture'
  const Icon = isPaused ? Play : Pause
  const baseColor = isPaused ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' : 'bg-primary/15 border-primary/30 text-primary'

  return (
    <motion.button
      onClick={toggle}
      title={title}
      aria-pressed={!isPaused}
      className={`flex items-center gap-2 px-4 h-10 rounded-full border ${baseColor} shadow-lg shadow-black/10 hover:shadow-black/20 transition-all`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
    
      <span className="font-semibold text-sm">{label}</span>
    </motion.button>
  )
}