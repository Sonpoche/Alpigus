// Chemin du fichier: hooks/use-cart-sync.ts
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLocalCart } from './use-local-cart'
import { useToast } from '@/hooks/use-toast'

export function useCartSync() {
  const { data: session, status } = useSession()
  const { items, clearCart } = useLocalCart()
  const { toast } = useToast()

  useEffect(() => {
    // Ne synchroniser que si l'utilisateur vient de se connecter
    // et qu'il y a des items dans le panier local
    if (status === 'authenticated' && session?.user?.id && items.length > 0) {
      syncCartWithBackend()
    }
  }, [status, session])

  const syncCartWithBackend = async () => {
    try {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Optionnel : vider le panier local après synchronisation
        // clearCart()
        
        toast({
          title: "Panier synchronisé",
          description: `${items.length} article(s) ajouté(s) à votre compte`
        })
        
        return data
      }
    } catch (error) {
      console.error('Erreur de synchronisation:', error)
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser votre panier",
        variant: "destructive"
      })
    }
  }

  return { syncCartWithBackend }
}