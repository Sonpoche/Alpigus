// components/layout/theme-toggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md bg-transparent border border-border hover:bg-accent hover:text-accent-foreground transition-all duration-200 group"
      aria-label="Changer le thème"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-foreground group-hover:rotate-180 transition-transform duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-foreground group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  )
}