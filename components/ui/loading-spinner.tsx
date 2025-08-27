// components/ui/loading-spinner.tsx
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'inverse'
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  variant = 'default' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  const variantClasses = {
    default: 'border-muted border-t-foreground',
    inverse: 'border-foreground/20 border-t-background'
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  )
}