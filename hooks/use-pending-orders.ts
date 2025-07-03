// hooks/use-pending-orders.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export function usePendingOrders() {
  const { data: session } = useSession()
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fonction pour récupérer le nombre de commandes en attente
  const fetchPendingOrders = useCallback(async () => {
    if (!session?.user || session.user.role !== 'PRODUCER') {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/orders/producer/pending-count', {
        // Empêcher la mise en cache
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.count || 0)
      } else {
        console.error('Erreur réponse:', response.status)
        setPendingCount(0)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes en attente:', error)
      setPendingCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  // Récupérer le nombre au chargement ET quand la session change
  useEffect(() => {
    fetchPendingOrders()
  }, [fetchPendingOrders])

  // Écouter les événements de mise à jour des commandes
  useEffect(() => {
    const handleOrderUpdate = () => {
      fetchPendingOrders()
    }

    // Écouter les événements personnalisés
    window.addEventListener('order:updated', handleOrderUpdate)
    window.addEventListener('order:status-changed', handleOrderUpdate)
    window.addEventListener('order:created', handleOrderUpdate)
    
    return () => {
      window.removeEventListener('order:updated', handleOrderUpdate)
      window.removeEventListener('order:status-changed', handleOrderUpdate)
      window.removeEventListener('order:created', handleOrderUpdate)
    }
  }, [fetchPendingOrders])

  // Fonction pour rafraîchir manuellement
  const refresh = useCallback(() => {
    fetchPendingOrders()
  }, [fetchPendingOrders])

  return {
    pendingCount,
    isLoading,
    refresh
  }
}