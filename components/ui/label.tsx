// components/ui/label.tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground",
  {
    variants: {
      variant: {
        default: "",
        subtle: "text-muted-foreground",
        required: "after:content-['*'] after:ml-0.5 after:text-destructive",
        inline: "inline-flex items-center gap-2",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, size, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant, size }), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

// Composants spécialisés
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean
  }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none text-foreground mb-2 block",
      required && "after:content-['*'] after:ml-0.5 after:text-destructive",
      className
    )}
    {...props}
  >
    {children}
  </LabelPrimitive.Root>
))
FormLabel.displayName = "FormLabel"

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    error?: boolean
  }
>(({ className, error, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none mb-1 block transition-colors",
      error ? "text-destructive" : "text-foreground",
      className
    )}
    {...props}
  />
))
FieldLabel.displayName = "FieldLabel"

export { Label, FormLabel, FieldLabel }