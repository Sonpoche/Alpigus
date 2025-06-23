// hooks/use-pending-invoices.ts
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function usePendingInvoices() {
  const { data: session } = useSession()
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchPendingInvoices = async () => {
    if (!session?.user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/invoices/pending-count')
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.count || 0)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des factures en attente:', error)
      setPendingCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Récupérer le nombre au chargement
  useEffect(() => {
    fetchPendingInvoices()
  }, [session])

  // Fonction pour rafraîchir manuellement
  const refresh = () => {
    fetchPendingInvoices()
  }

  return {
    pendingCount,
    isLoading,
    refresh
  }
}