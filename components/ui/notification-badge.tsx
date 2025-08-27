// components/ui/notification-badge.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
  maxCount?: number
  variant?: 'default' | 'sidebar' | 'minimal'
}

export function NotificationBadge({ 
  count, 
  className, 
  maxCount = 99, 
  variant = 'default' 
}: NotificationBadgeProps) {
  // Ne rien afficher si count est 0 ou négatif
  if (count <= 0) return null

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  if (variant === 'sidebar') {
    return (
      <AnimatePresence>
        <motion.span
          key="sidebar-badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className={cn(
            "ml-2 min-w-[22px] h-[22px] bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-minimal border border-border",
            className
          )}
        >
          {displayCount}
        </motion.span>
      </AnimatePresence>
    )
  }

  if (variant === 'minimal') {
    return (
      <AnimatePresence>
        <motion.span
          key="minimal-badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className={cn(
            "absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-muted text-muted-foreground text-xs font-medium rounded-full flex items-center justify-center px-1 border border-border",
            className
          )}
        >
          {displayCount}
        </motion.span>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.span
        key="default-badge"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={cn(
          "absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-card border-2 border-background",
          className
        )}
      >
        {displayCount}
      </motion.span>
    </AnimatePresence>
  )
}