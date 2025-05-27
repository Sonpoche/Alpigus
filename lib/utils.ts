import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fonction utilitaire pour les classes de conteneurs responsives
export function containerClasses(extraClasses?: string) {
  return cn(
    "w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8",
    "box-border overflow-x-hidden min-w-0",
    extraClasses
  )
}

// Fonction utilitaire pour les grilles responsives
export function gridClasses(cols: {
  default?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}, extraClasses?: string) {
  const classes = ["grid", "gap-4", "w-full", "max-w-full"]
  
  if (cols.default) classes.push(`grid-cols-${cols.default}`)
  if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
  if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)
  
  return cn(classes.join(" "), extraClasses)
}

// Fonction utilitaire pour les cartes responsives
export function cardClasses(extraClasses?: string) {
  return cn(
    "bg-background border border-foreground/10 rounded-lg shadow-card hover:shadow-hover transition-shadow duration-300 overflow-hidden",
    "w-full max-w-full min-w-0",
    extraClasses
  )
}

// Fonction utilitaire pour les espacements responsives
export function spacingClasses(size: 'sm' | 'md' | 'lg' | 'xl' = 'md') {
  const spacing = {
    sm: "p-4 sm:p-6",
    md: "p-6 sm:p-8",
    lg: "p-8 sm:p-12",
    xl: "p-12 sm:p-16"
  }
  
  return spacing[size]
}