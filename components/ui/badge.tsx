// components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-custom-accent text-white",
        secondary: "bg-custom-accentLight text-custom-accent",
        outline: "border border-foreground/10 text-foreground/80",
        success: "bg-success/20 text-success border border-success/30",
        warning: "bg-warning/20 text-warning border border-warning/30",
        destructive: "bg-destructive/20 text-destructive border border-destructive/30",
        info: "bg-info/20 text-info border border-info/30",
        new: "bg-blue-500/10 text-blue-500 border border-blue-500/30",
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