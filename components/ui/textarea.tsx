// components/ui/textarea.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'minimal' | 'ghost'
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = "flex min-h-[80px] w-full text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all duration-200"
    
    const variantClasses = {
      default: "rounded-md border border-input bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      minimal: "border-0 border-l-2 border-border bg-transparent px-3 py-2 rounded-none focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
      ghost: "rounded-md border border-transparent bg-muted/50 px-3 py-2 hover:bg-muted focus-visible:bg-background focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    }
    
    return (
      <textarea
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
Textarea.displayName = "Textarea"

// Variante avec compteur de caractères
const TextareaWithCounter = React.forwardRef<
  HTMLTextAreaElement, 
  TextareaProps & { maxLength?: number; showCounter?: boolean }
>(({ className, maxLength, showCounter = true, variant = 'default', ...props }, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || '')
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    props.onChange?.(e)
  }
  
  const currentLength = String(value).length
  const isNearLimit = maxLength && currentLength > maxLength * 0.8
  const isOverLimit = maxLength && currentLength > maxLength
  
  return (
    <div className="space-y-2">
      <Textarea
        ref={ref}
        className={className}
        variant={variant}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        {...props}
      />
      {showCounter && maxLength && (
        <div className="flex justify-end">
          <span className={cn(
            "text-xs transition-colors",
            isOverLimit ? "text-destructive" : 
            isNearLimit ? "text-warning" : "text-muted-foreground"
          )}>
            {currentLength}/{maxLength}
          </span>
        </div>
      )}
    </div>
  )
})
TextareaWithCounter.displayName = "TextareaWithCounter"

export { Textarea, TextareaWithCounter }