import { cva } from 'class-variance-authority'
import { ReactNode } from 'react'
import { motion } from 'framer-motion'

const button = cva('inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 font-semibold rounded-2xl group relative overflow-hidden',{
  variants:{
    variant:{
      primary:'bg-gradient-to-r from-primary to-primary/90 text-black hover:from-primary/90 hover:to-primary shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:shadow-primary/50',
      ghost:'bg-transparent text-white hover:bg-white/10 border border-white/10 hover:border-white/20',
      destructive:'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/20 hover:shadow-red-500/30',
      outline:'border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30 active:bg-white/5',
      default:'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/20 active:bg-white/5'
    },
    size:{ 
      sm:'h-10 px-5 text-sm', 
      md:'h-12 px-6 text-base', 
      lg:'h-14 px-8 text-lg',
      icon:'h-12 w-12'
    }
  },
  defaultVariants:{ variant:'primary', size:'md' }
})

export default function Button({ children, variant, size, onClick, type="button", className = "", disabled = false }:{ 
  children:ReactNode, 
  variant?:'primary'|'ghost'|'destructive'|'outline'|'default', 
  size?:'sm'|'md'|'lg'|'icon', 
  onClick?:()=>void, 
  type?:'button'|'submit',
  className?: string,
  disabled?: boolean
}){
  return (
    <motion.button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${button({variant, size})} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {children}
    </motion.button>
  )
}