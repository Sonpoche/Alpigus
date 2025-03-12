// app/(protected)/confirmation/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Calendar, Package, Download, Home } from 'lucide-react'
import { formatDateToFrench } from '@/lib/date-utils'
import Link from 'next/link'

interface ConfirmationProps {
  params: {
    id: string
  }
}

export default function ConfirmationPage({ params }: ConfirmationProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id)
    }
  }, [params.id])
  
  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      
      if (!response.ok) {
        router.push('/dashboard')
        return
      }
      
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails de votre commande',
        variant: 'destructive'
      })
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Formater les dates de livraison
  const getDeliveryDates = () => {
    if (!order?.bookings?.length) return []
    
    const dates = order.bookings.map((booking: any) => {
      const date = new Date(booking.deliverySlot.date)
      return {
        date,
        formattedDate: formatDateToFrench(date),
        product: booking.deliverySlot.product.name,
        quantity: booking.quantity,
        unit: booking.deliverySlot.product.unit
      }
    })
    
    return dates.sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
  }
  
  const deliveryDates = getDeliveryDates()
  const orderDate = order ? new Date(order.createdAt) : new Date()
  const orderNumber = params.id.substring(0, 8).toUpperCase()
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/20 w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Commande confirmée</h1>
        <p className="text-muted-foreground mb-8">
          Merci pour votre commande ! Un email de confirmation a été envoyé à votre adresse.
        </p>
        
        <div className="bg-foreground/5 rounded-lg p-6 text-left mb-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Numéro de commande</p>
              <p className="font-medium">{orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date de commande</p>
              <p className="font-medium">{formatDateToFrench(orderDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium">{order.total.toFixed(2)} CHF</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <p className="font-medium text-green-600 dark:text-green-400">Confirmée</p>
            </div>
          </div>
          
          {/* Produits commandés */}
          <h2 className="font-semibold mb-3 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Produits commandés
          </h2>
          <ul className="list-disc list-inside mb-6 space-y-1">
            {order.items.map((item: any) => (
              <li key={item.id}>
                {item.quantity} {item.product.unit} de {item.product.name} ({(item.price * item.quantity).toFixed(2)} CHF)
              </li>
            ))}
          </ul>
          
          {/* Livraisons programmées */}
          {deliveryDates.length > 0 && (
            <>
              <h2 className="font-semibold mb-3 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Livraisons programmées
              </h2>
              <ul className="list-disc list-inside space-y-1">
                {deliveryDates.map((delivery: any, index: number) => (
                  <li key={index}>
                    {delivery.formattedDate}: {delivery.quantity} {delivery.unit} de {delivery.product}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-custom-accent text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity"
          >
            <Home className="h-5 w-5" />
            Retour à l'accueil
          </Link>
          
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 border border-foreground/10 px-6 py-3 rounded-md hover:bg-foreground/5 transition-colors"
          >
            <Download className="h-5 w-5" />
            Imprimer confirmation
          </button>
        </div>
      </div>
    </div>
  )
}