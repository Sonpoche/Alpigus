// components/orders/order-pickup-address.tsx
'use client'

import { useState, useEffect } from 'react'
import { MapPin, Store, Phone } from 'lucide-react'

interface OrderPickupAddressProps {
  orderId: string
  deliveryType: string
}

export default function OrderPickupAddress({ orderId, deliveryType }: OrderPickupAddressProps) {
  const [producerDetails, setProducerDetails] = useState<{
    companyName: string
    address: string
    phone: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si ce n'est pas un retrait sur place, ne rien faire
    if (deliveryType !== 'pickup') {
      setIsLoading(false)
      return
    }

    async function fetchProducerAddress() {
      try {
        setIsLoading(true)
        // Récupérer les détails du producteur pour cette commande
        const response = await fetch(`/api/orders/${orderId}/producer-details`)
        
        if (!response.ok) {
          throw new Error('Impossible de récupérer les informations du producteur')
        }
        
        const data = await response.json()
        setProducerDetails(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger l\'adresse de retrait')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducerAddress()
  }, [orderId, deliveryType])

  // Ne rien afficher si ce n'est pas un retrait sur place
  if (deliveryType !== 'pickup') {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  if (error || !producerDetails) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
        Contactez le support pour obtenir l'adresse de retrait.
      </div>
    )
  }

  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-4 mt-4">
      <h3 className="font-medium text-base mb-3 flex items-center gap-2">
        <Store className="h-5 w-5 text-custom-accent" />
        Adresse de retrait
      </h3>
      
      <div className="space-y-2 text-sm">
        <p className="font-semibold">{producerDetails.companyName}</p>
        
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <p className="text-foreground/80 whitespace-pre-line">{producerDetails.address}</p>
        </div>
        
        {producerDetails.phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
            <p className="text-foreground/80">{producerDetails.phone}</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-foreground/60 bg-foreground/5 p-3 rounded-md">
        Veuillez vous présenter avec votre numéro de commande (#CMAXSYJ) lors du retrait.
      </div>
    </div>
  )
}