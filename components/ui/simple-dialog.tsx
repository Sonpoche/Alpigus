// components/ui/simple-dialog.tsx
'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Types explicites et simplifiés
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

// Contexte du Dialog
const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null)

// Hook personnalisé pour utiliser le contexte du Dialog
function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('useDialogContext doit être utilisé dans un Dialog')
  }
  return context
}

// Composant Dialog principal
function SimpleDialog({ open, onOpenChange, children }: DialogProps) {
  // Fermer avec Echap
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])
  
  // Empêcher le scroll du body quand ouvert
  React.useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [open])
  
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

// Contenu du Dialog
function SimpleDialogContent({ className, children }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext()
  
  if (!open) return null
  
  // Overlay et contenu
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Overlay avec transition */}
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Contenu */}
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 z-50 border border-foreground/10",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture */}
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </button>
        
        {children}
      </div>
    </div>
  )
}

// Composants auxiliaires pour la structure
function SimpleDialogHeader({ className, ...props }: React.HTMLProps<HTMLDivElement>) {
  return <div className={cn("mb-4 pr-8", className)} {...props} />
}

function SimpleDialogFooter({ className, ...props }: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 gap-2",
        className
      )}
      {...props}
    />
  )
}

function SimpleDialogTitle({ className, ...props }: React.HTMLProps<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-foreground", className)} {...props} />
}

function SimpleDialogDescription({ className, ...props }: React.HTMLProps<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

// Export renommé pour l'usage
export {
  SimpleDialog as Dialog,
  SimpleDialogContent as DialogContent,
  SimpleDialogHeader as DialogHeader,
  SimpleDialogFooter as DialogFooter,
  SimpleDialogTitle as DialogTitle,
  SimpleDialogDescription as DialogDescription
}