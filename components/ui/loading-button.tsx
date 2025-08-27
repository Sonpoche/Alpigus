// components/ui/loading-button.tsx
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "flex items-center justify-center rounded-md transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Style par défaut - noir pur
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring",
        
        // Style outline - bordure uniquement
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground focus:ring-ring",
        
        // Style ghost - transparent avec hover
        ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground text-foreground focus:ring-ring",
        
        // États fonctionnels en nuances de gris
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive",
        success: "bg-success text-success-foreground hover:bg-success/90 focus:ring-success",
        
        // Style secondaire
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring",
        
        // Style minimal - très discret
        minimal: "bg-transparent text-foreground border border-transparent hover:border-border hover:bg-muted focus:ring-ring",
      },
      size: {
        xs: "text-xs px-2 py-1 h-7",
        sm: "text-sm px-3 py-2 h-8",
        default: "text-sm px-4 py-2 h-9",
        lg: "text-base px-6 py-3 h-10",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      width: "auto",
    },
  }
)

interface LoadingButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  loadingText?: string;
}

export function LoadingButton({ 
  isLoading = false, 
  children, 
  disabled, 
  className = '',
  variant,
  size,
  width,
  icon,
  loadingText = "Chargement...",
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={cn(buttonVariants({ variant, size, width }), className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}