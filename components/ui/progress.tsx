// components/ui/progress.tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'minimal' | 'thick'
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'h-2',
    minimal: 'h-1',
    thick: 'h-3'
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        sizeClasses[variant],
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-500 ease-out bg-foreground"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`
        }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Variante avec texte de pourcentage
const ProgressWithLabel = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps & { showLabel?: boolean }
>(({ className, value, variant = 'default', showLabel = true, ...props }, ref) => {
  return (
    <div className="w-full space-y-2">
      <Progress
        ref={ref}
        className={className}
        value={value}
        variant={variant}
        {...props}
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium text-foreground">{Math.round(value || 0)}%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
})
ProgressWithLabel.displayName = "ProgressWithLabel"

export { Progress, ProgressWithLabel }