// hooks/use-pending-invoices.ts - VERSION CORRIGÉE
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export function usePendingInvoices() {
  const { data: session } = useSession()
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // ✅ CORRECTION: Fonction avec useCallback pour éviter les re-renders inutiles
  const fetchPendingInvoices = useCallback(async () => {
    // 🔧 MODIFICATION : Seuls les CLIENTS ont des factures à payer
    if (!session?.user || session.user.role !== 'CLIENT') {
      setIsLoading(false)
      setPendingCount(0) // Producteurs et admins n'ont pas de factures à payer
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/invoices/pending-count', {
        // ✅ CORRECTION: Empêcher la mise en cache
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
      console.error('Erreur lors de la récupération des factures en attente:', error)
      setPendingCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  // ✅ CORRECTION: Récupérer le nombre au chargement ET quand la session change
  useEffect(() => {
    fetchPendingInvoices()
  }, [fetchPendingInvoices])

  // ✅ CORRECTION: Écouter les événements de mise à jour des factures
  useEffect(() => {
    const handleInvoiceUpdate = () => {
      console.log('🔄 Invoice update detected, refreshing count...')
      fetchPendingInvoices()
    }

    // Écouter les événements personnalisés
    window.addEventListener('invoice:updated', handleInvoiceUpdate)
    window.addEventListener('invoice:paid', handleInvoiceUpdate)
    window.addEventListener('invoice:created', handleInvoiceUpdate)
    
    return () => {
      window.removeEventListener('invoice:updated', handleInvoiceUpdate)
      window.removeEventListener('invoice:paid', handleInvoiceUpdate)
      window.removeEventListener('invoice:created', handleInvoiceUpdate)
    }
  }, [fetchPendingInvoices])

  // ✅ CORRECTION: Fonction pour rafraîchir manuellement avec force
  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered')
    fetchPendingInvoices()
  }, [fetchPendingInvoices])

  return {
    pendingCount,
    isLoading,
    refresh
  }
}