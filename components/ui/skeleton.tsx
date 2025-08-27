// components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'pulse' | 'wave'
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  const baseClasses = "rounded-md bg-muted"
  
  const variantClasses = {
    default: "animate-pulse",
    pulse: "animate-pulse",
    wave: "skeleton" // Utilise l'animation wave du CSS global
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    />
  )
}

// Composants de skeleton prédéfinis
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-[200px] w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number, className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size])} />
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-9 w-20 rounded-md", className)} />
  )
}