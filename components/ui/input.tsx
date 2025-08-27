// components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'minimal' | 'ghost'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    const baseClasses = "flex h-10 w-full rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
    
    const variantClasses = {
      default: "border border-input bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      minimal: "border-0 border-b border-border bg-transparent px-0 py-2 rounded-none focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
      ghost: "border border-transparent bg-muted/50 px-3 py-2 hover:bg-muted focus-visible:bg-background focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    }
    
    return (
      <input
        type={type}
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Variantes spécialisées
const InputSearch = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="search"
      className={cn(
        "pl-10 pr-4", // Space pour icône de recherche
        className
      )}
      {...props}
    />
  )
)
InputSearch.displayName = "InputSearch"

const InputNumber = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      className={cn(
        "text-right", // Alignement à droite pour les nombres
        className
      )}
      {...props}
    />
  )
)
InputNumber.displayName = "InputNumber"

export { Input, InputSearch, InputNumber }