// Chemin du fichier: components/layout/app-wrapper.tsx
'use client'

import { useEffect } from 'react'
import { useLocalCart } from '@/hooks/use-local-cart'
import { useCartSync } from '@/hooks/use-cart-sync'
import { CartButton } from '@/components/cart/cart-button'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  // Hydrater le store local au montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
  }, [])

  // Synchroniser automatiquement le panier quand l'utilisateur se connecte
  useCartSync()

  return (
    <>
      {children}
      {/* CartButton universel en position fixe pour les pages publiques */}
      <div className="fixed top-20 right-8 z-40">
        <CartButton variant="public" />
      </div>
    </>
  )
}