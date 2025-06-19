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
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ 
    value, 
    onChange, 
    currency = 'CHF',
    showCurrency = false,
    maxValue = 999999.99,
    minValue = 0,
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
            "w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
            showCurrency && "pr-12",
            className
          )}
          {...props}
        />
        {showCurrency && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {currency}
          </div>
        )}
      </div>
    )
  }
)

PriceInput.displayName = "PriceInput"