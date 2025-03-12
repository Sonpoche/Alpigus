// components/ui/loading-button.tsx
import { Loader2 } from "lucide-react"

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ 
  isLoading = false, 
  children, 
  disabled, 
  className = '', 
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={`w-full flex items-center justify-center bg-custom-accent text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-montserrat ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        children
      )}
    </button>
  )
}