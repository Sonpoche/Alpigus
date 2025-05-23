// components/orders/order-delivery-address.tsx
'use client'

import { useState, useEffect } from 'react'
import { MapPin, Home, Phone, User, FileText } from 'lucide-react'

interface OrderDeliveryAddressProps {
  orderId: string
  deliveryType: string
}

export default function OrderDeliveryAddress({ orderId, deliveryType }: OrderDeliveryAddressProps) {
  const [deliveryDetails, setDeliveryDetails] = useState<{
    fullName: string
    company?: string
    address: string
    postalCode: string
    city: string
    phone: string
    notes?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si ce n'est pas une livraison à domicile, ne rien faire
    if (deliveryType !== 'delivery') {
      setIsLoading(false)
      return
    }

    async function fetchDeliveryAddress() {
      try {
        setIsLoading(true)
        // Récupérer les détails de livraison pour cette commande
        const response = await fetch(`/api/orders/${orderId}/delivery-details`)
        
        if (!response.ok) {
          throw new Error('Impossible de récupérer les informations de livraison')
        }
        
        const data = await response.json()
        setDeliveryDetails(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger l\'adresse de livraison')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeliveryAddress()
  }, [orderId, deliveryType])

  // Ne rien afficher si ce n'est pas une livraison à domicile
  if (deliveryType !== 'delivery') {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  if (error || !deliveryDetails) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
        Informations de livraison non disponibles. Contactez le client directement.
      </div>
    )
  }

  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-4 mt-4">
      <h3 className="font-medium text-base mb-3 flex items-center gap-2">
        <Home className="h-5 w-5 text-custom-accent" />
        Adresse de livraison
      </h3>
      
      <div className="space-y-3 text-sm">
        {/* Informations du destinataire */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{deliveryDetails.fullName}</p>
            {deliveryDetails.company && (
              <p className="text-foreground/70">{deliveryDetails.company}</p>
            )}
          </div>
        </div>
        
        {/* Adresse complète */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-foreground/80">{deliveryDetails.address}</p>
            <p className="text-foreground/80">
              {deliveryDetails.postalCode} {deliveryDetails.city}
            </p>
          </div>
        </div>
        
        {/* Téléphone */}
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <p className="text-foreground/80">{deliveryDetails.phone}</p>
        </div>
        
        {/* Notes de livraison si présentes */}
        {deliveryDetails.notes && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Instructions spéciales :</p>
              <p className="text-foreground/80 italic">{deliveryDetails.notes}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-foreground/60 bg-foreground/5 p-3 rounded-md">
        <p className="font-medium mb-1">Informations de livraison :</p>
        <p>• Frais de livraison : 15.00 CHF</p>
        <p>• Numéro de commande : #{orderId.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  )
}