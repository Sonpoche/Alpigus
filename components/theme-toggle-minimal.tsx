// components/theme-toggle-minimal.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggleMinimal() {
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
      className="fixed bottom-4 right-4 p-3 rounded-full bg-card border border-border hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-card hover:shadow-hover group"
      aria-label="Changer le thème"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-foreground group-hover:rotate-180 transition-transform duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-foreground group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  )
}