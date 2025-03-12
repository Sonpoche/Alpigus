'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { Trash2, ShoppingCart, Loader2, Calendar, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { formatDateToFrench } from '@/lib/date-utils'
import { LoadingButton } from '@/components/ui/loading-button'

interface CartItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    type: ProductType
    image: string | null
  }
}

interface Booking {
  id: string
  quantity: number
  status: 'TEMPORARY' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  expiresAt: string | null
  deliverySlot: {
    id: string
    date: string
    product: {
      id: string
      name: string
      unit: string
      image: string | null
    }
  }
}

interface Order {
  id: string
  items: CartItem[]
  bookings: Booking[]
  total: number
  status: string
}

export default function CartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Récupérer l'ID de la commande actuelle depuis le localStorage
  useEffect(() => {
    const currentOrderId = localStorage.getItem('currentOrderId')
    if (currentOrderId) {
      fetchOrder(currentOrderId)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Charger les détails de la commande
  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Si la commande n'existe plus, supprimer l'ID du localStorage
          localStorage.removeItem('currentOrderId')
          setOrder(null)
          return
        }
        throw new Error('Erreur lors de la récupération de la commande')
      }
      
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger votre panier',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Mettre à jour la quantité d'un article
  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (!order) return
    
    try {
      setUpdatingItemId(itemId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      
      if (!response.ok) throw new Error('Erreur lors de la mise à jour de la quantité')
      
      // Recharger la commande pour avoir les données à jour
      fetchOrder(order.id)
      
      toast({
        title: 'Quantité mise à jour',
        description: 'La quantité a été mise à jour avec succès'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la quantité',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Supprimer un article du panier
  const removeItem = async (itemId: string) => {
    if (!order) return
    
    try {
      setUpdatingItemId(itemId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'article')
      
      // Recharger la commande pour avoir les données à jour
      fetchOrder(order.id)
      
      toast({
        title: 'Article supprimé',
        description: 'L\'article a été supprimé de votre panier'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Annuler une réservation
  const cancelBooking = async (bookingId: string) => {
    if (!order) return
    
    try {
      setUpdatingItemId(bookingId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de l\'annulation de la réservation')
      
      // Recharger la commande pour avoir les données à jour
      fetchOrder(order.id)
      
      toast({
        title: 'Réservation annulée',
        description: 'La réservation a été annulée avec succès'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler la réservation',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Procéder au checkout
  const proceedToCheckout = async () => {
    if (!order) return
    
    try {
      setIsCheckingOut(true)
      
      // Rediriger vers la page de checkout
      router.push(`/checkout/${order.id}`)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de procéder au paiement',
        variant: 'destructive'
      })
      setIsCheckingOut(false)
    }
  }

  // Calcul du total pour les produits standards (non-frais)
  const regularItemsTotal = order?.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0) || 0

  // Calcul du total pour les réservations
  const bookingsTotal = order?.bookings.reduce((sum, booking) => {
    // Supposons que le prix est stocké dans le produit de la réservation
    // Vous devrez peut-être adapter cette logique selon votre modèle de données
    return sum + (booking.quantity * 0) // À adapter si nécessaire
  }, 0) || 0

  // Total général
  const grandTotal = regularItemsTotal + bookingsTotal

  // Vérifier si le panier est vide
  const isCartEmpty = !order || (order.items.length === 0 && order.bookings.length === 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />
        Votre Panier
      </h1>

      {isCartEmpty ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6">Vous n'avez pas encore ajouté de produits à votre panier.</p>
          <Link 
            href="/products" 
            className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Découvrir nos produits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale avec les produits et réservations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Produits standards */}
            {order?.items.length > 0 && (
              <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-foreground/10">
                  <h2 className="font-semibold">Produits</h2>
                </div>
                
                <div className="divide-y divide-foreground/10">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-4 flex items-center">
                      {/* Image du produit */}
                      <div className="w-16 h-16 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0 mr-4">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-foreground/30">
                            <ShoppingCart className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      
                      {/* Informations du produit */}
                      <div className="flex-1">
                        <Link href={`/products/${item.product.id}`} className="font-medium hover:text-custom-accent">
                          {item.product.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {item.price.toFixed(2)} CHF / {item.product.unit}
                        </div>
                      </div>
                      
                      {/* Contrôles de quantité */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <button
                            onClick={() => updateItemQuantity(item.id, Math.max(0.1, item.quantity - 0.1))}
                            disabled={isUpdating}
                            className="w-8 h-8 flex items-center justify-center border border-foreground/10 rounded-l-md hover:bg-foreground/5"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value > 0) {
                                updateItemQuantity(item.id, value);
                              }
                            }}
                            min="0.1"
                            step="0.1"
                            className="w-16 h-8 border-y border-foreground/10 text-center"
                          />
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity + 0.1)}
                            disabled={isUpdating}
                            className="w-8 h-8 flex items-center justify-center border border-foreground/10 rounded-r-md hover:bg-foreground/5"
                          >
                            +
                          </button>
                        </div>
                        
                        {/* Sous-total */}
                        <div className="w-24 text-right">
                          {(item.price * item.quantity).toFixed(2)} CHF
                        </div>
                        
                        {/* Bouton supprimer */}
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={isUpdating}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2"
                          aria-label="Supprimer l'article"
                        >
                          {updatingItemId === item.id && isUpdating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Réservations */}
            {order?.bookings.length > 0 && (
              <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-foreground/10">
                  <h2 className="font-semibold">Réservations de Livraison</h2>
                </div>
                
                <div className="divide-y divide-foreground/10">
                  {order.bookings.map((booking) => {
                    const deliveryDate = new Date(booking.deliverySlot.date);
                    const isExpiring = booking.status === 'TEMPORARY' && booking.expiresAt;
                    const expiryDate = booking.expiresAt ? new Date(booking.expiresAt) : null;
                    const timeRemaining = expiryDate ? Math.max(0, Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60))) : null;
                    
                    return (
                      <div key={booking.id} className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Icône calendrier */}
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          
                          {/* Informations de réservation */}
                          <div className="flex-1">
                            <div className="font-medium">
                              {booking.deliverySlot.product.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Livraison le {formatDateToFrench(deliveryDate)}
                            </div>
                            <div className="text-sm">
                              Quantité: {booking.quantity} {booking.deliverySlot.product.unit}
                            </div>
                            
                            {/* Notification d'expiration pour les réservations temporaires */}
                            {isExpiring && timeRemaining !== null && (
                              <div className="mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded">
                                Cette réservation expirera dans {timeRemaining} minute{timeRemaining > 1 ? 's' : ''} si vous ne finalisez pas votre commande.
                              </div>
                            )}
                          </div>
                          
                          {/* Bouton annuler */}
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            disabled={isUpdating}
                            className="text-muted-foreground hover:text-destructive transition-colors p-2"
                            aria-label="Annuler la réservation"
                          >
                            {updatingItemId === booking.id && isUpdating ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Résumé de la commande */}
          <div className="lg:col-span-1">
            <div className="bg-background border border-foreground/10 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Résumé de la commande</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{regularItemsTotal.toFixed(2)} CHF</span>
                </div>
                {/* Vous pouvez ajouter d'autres éléments comme les frais de livraison, taxes, etc. */}
              </div>
              
              <div className="border-t border-foreground/10 pt-2 mb-6">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{grandTotal.toFixed(2)} CHF</span>
                </div>
              </div>
              
              <LoadingButton
                onClick={proceedToCheckout}
                isLoading={isCheckingOut}
                disabled={isCartEmpty || isUpdating}
                className="w-full flex items-center justify-center gap-2"
              >
                Procéder au paiement
                <ChevronRight className="h-4 w-4" />
              </LoadingButton>
              
              <div className="mt-4">
                <Link href="/products" className="text-sm text-center w-full block text-custom-accent hover:opacity-80">
                  Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}