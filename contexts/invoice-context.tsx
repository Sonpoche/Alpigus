// contexts/invoice-context.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePendingInvoices } from '@/hooks/use-pending-invoices'

interface InvoiceContextType {
  pendingCount: number
  isLoading: boolean
  refreshPendingCount: () => void
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined)

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const { pendingCount, isLoading, refresh } = usePendingInvoices()

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