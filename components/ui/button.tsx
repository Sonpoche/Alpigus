// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Style par défaut - noir pur
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
        
        // Style destructif - gris foncé pour les actions dangereuses
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95",
        
        // Style outline - bordure uniquement
        outline: "border-2 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        
        // Style secondaire - gris clair
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90",
        
        // Style ghost - transparent avec hover subtil
        ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        
        // Style link - comme un lien
        link: "text-foreground underline-offset-4 hover:underline bg-transparent",
        
        // Style minimal - très discret
        minimal: "bg-transparent text-foreground border border-transparent hover:border-border hover:bg-muted active:bg-muted/80",
        
        // Style inverse - blanc sur noir en light mode, noir sur blanc en dark mode
        inverse: "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/95",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        xs: "h-7 rounded px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }