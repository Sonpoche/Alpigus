// contexts/order-context.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePendingOrders } from '@/hooks/use-pending-orders'

interface OrderContextType {
  pendingCount: number
  isLoading: boolean
  refreshPendingCount: () => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const { pendingCount, isLoading, refresh } = usePendingOrders()

  return (
    <OrderContext.Provider 
      value={{ 
        pendingCount, 
        isLoading, 
        refreshPendingCount: refresh 
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}

export function useOrderContext() {
  const context = useContext(OrderContext)
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