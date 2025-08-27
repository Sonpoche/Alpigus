// components/ui/price-input.tsx
import React, { forwardRef } from 'react'
import { formatInputValue, isValidDecimalInput, parseToTwoDecimals } from '@/lib/number-utils'
import { cn } from '@/lib/utils'

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: string | number
  onChange: (value: string) => void
  currency?: string
  showCurrency?: boolean
  maxValue?: number
  minValue?: number
  variant?: 'default' | 'minimal' | 'ghost'
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ 
    value, 
    onChange, 
    currency = 'CHF',
    showCurrency = false,
    maxValue = 999999.99,
    minValue = 0,
    variant = 'default',
    className,
    onBlur,
    ...props 
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const formatted = formatInputValue(inputValue)
      
      if (isValidDecimalInput(formatted) || formatted === '') {
        // Vérifier les limites
        const numValue = parseFloat(formatted)
        if (!isNaN(numValue)) {
          if (numValue <= maxValue && numValue >= minValue) {
            onChange(formatted)
          }
        } else {
          onChange(formatted) // Permet les valeurs vides
        }
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Forcer 2 décimales max lors de la perte de focus
      const numValue = parseFloat(e.target.value)
      if (!isNaN(numValue)) {
        const parsed = parseToTwoDecimals(numValue)
        onChange(parsed.toString())
      }
      
      // Appeler le onBlur parent si fourni
      if (onBlur) {
        onBlur(e)
      }
    }

    const baseClasses = "w-full text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    
    const variantClasses = {
      default: "rounded-md border border-input bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      minimal: "border-0 border-b border-border bg-transparent px-0 py-2 rounded-none focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
      ghost: "rounded-md border border-transparent bg-muted/50 px-3 py-2 hover:bg-muted focus-visible:bg-background focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          step="0.01"
          min={minValue}
          max={maxValue}
          className={cn(
            baseClasses,
            variantClasses[variant],
            showCurrency && variant !== 'minimal' && "pr-12",
            showCurrency && variant === 'minimal' && "pr-8",
            className
          )}
          {...props}
        />
        {showCurrency && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none font-medium",
            variant === 'minimal' ? "right-0" : "right-3"
          )}>
            {currency}
          </div>
        )}
      </div>
    )
  }
)

PriceInput.displayName = "PriceInput"