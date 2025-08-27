// components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Style par défaut - noir sur blanc / blanc sur noir
        default: "bg-primary text-primary-foreground",
        
        // Style secondaire - gris clair
        secondary: "bg-secondary text-secondary-foreground",
        
        // Style outline - bordure uniquement
        outline: "border border-border bg-transparent text-foreground",
        
        // États fonctionnels en nuances de gris uniquement
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground", 
        destructive: "bg-destructive text-destructive-foreground",
        info: "bg-muted text-muted-foreground",
        
        // Style minimal - ultra discret
        minimal: "bg-muted/50 text-muted-foreground border border-border/50",
        
        // Style ghost - transparent avec hover
        ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}