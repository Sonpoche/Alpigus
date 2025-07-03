// contexts/invoice-context.tsx
'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { usePendingInvoices } from '@/hooks/use-pending-invoices'

interface InvoiceContextType {
  pendingCount: number
  isLoading: boolean
  refreshPendingCount: () => void
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined)

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const { pendingCount, isLoading, refresh } = usePendingInvoices()

  // ✅ NOUVEAU: Écouter les changements de focus pour rafraîchir
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing invoice count...')
      refresh()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Tab became visible, refreshing invoice count...')
        refresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  return (
    <InvoiceContext.Provider 
      value={{ 
        pendingCount, 
        isLoading, 
        refreshPendingCount: refresh 
      }}
    >
      {children}
    </InvoiceContext.Provider>
  )
}

export function useInvoiceContext() {
  const context = useContext(InvoiceContext)
  if (context === undefined) {
    // Retourner des valeurs par défaut au lieu de lever une erreur
    // pour éviter les problèmes si le contexte n'est pas disponible
    return {
      pendingCount: 0,
      isLoading: false,
      refreshPendingCount: () => {}
    }
  }
  return context
}