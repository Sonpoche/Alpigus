// Chemin du fichier: components/layout/app-wrapper.tsx
'use client'

import { useEffect } from 'react'
import { useLocalCart } from '@/hooks/use-local-cart'
import { useCartSync } from '@/hooks/use-cart-sync'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  // Hydrater le store local au montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
  }, [])

  // Synchroniser automatiquement le panier quand l'utilisateur se connecte
  useCartSync()

  return <>{children}</>
}