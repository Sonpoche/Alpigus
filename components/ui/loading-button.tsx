// components/ui/loading-button.tsx
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "flex items-center justify-center rounded-md transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-custom-accent text-white hover:bg-custom-accentHover focus:ring-custom-accent",
        outline: "border border-foreground/10 bg-background hover:bg-foreground/5 text-foreground focus:ring-custom-accent",
        ghost: "bg-transparent hover:bg-foreground/5 text-foreground focus:ring-foreground/10",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive",
        success: "bg-success text-success-foreground hover:bg-success/90 focus:ring-success",
      },
      size: {
        xs: "text-xs px-2 py-1",
        sm: "text-sm px-3 py-2",
        default: "text-base px-4 py-2",
        lg: "text-lg px-6 py-3",
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
          <span>Chargement...</span>
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