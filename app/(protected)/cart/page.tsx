// app/(protected)/cart/page.tsx
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

interface DeliverySlot {
  id: string
  date: string
  product: {
    id: string
    name: string
    price: number
    unit: string
    image: string | null
  }
}

interface Booking {
  id: string
  quantity: number
  price?: number
  status: 'TEMPORARY' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  expiresAt: string | null
  deliverySlot: DeliverySlot
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
  const [debug, setDebug] = useState<any>(null)

  // Récupérer l'ID de la commande actuelle depuis le localStorage
  useEffect(() => {
    const currentOrderId = localStorage.getItem('currentOrderId')
    if (currentOrderId) {
      fetchOrder(currentOrderId)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Rafraîchir périodiquement pour éliminer les réservations expirées
  useEffect(() => {
    if (!order?.id) return;
    
    const interval = setInterval(() => {
      fetchOrder(order.id);
    }, 30000); // Rafraîchir toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [order?.id]);

  // Charger les détails de la commande
  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true)
      
      // Avant de récupérer la commande, lancer le nettoyage des réservations expirées
      await fetch('/api/bookings/cleanup', { method: 'POST' });
      
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
      console.log("Ordre récupéré:", data)
      console.log("Bookings dans l'ordre:", data.bookings)
      setDebug(data) // Stocker pour le débogage
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
      
      // Mise à jour optimiste de l'interface
      if (order.items) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
        
        setOrder({
          ...order,
          items: updatedItems
        });
      }
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      
      if (!response.ok) throw new Error('Erreur lors de la mise à jour de la quantité')
      
      // Recharger la commande après un court délai pour s'assurer que les changements sont pris en compte
      setTimeout(() => {
        fetchOrder(order.id)
      }, 300)
      
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
      
      // En cas d'erreur, recharger pour restaurer l'état correct
      fetchOrder(order.id)
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
      
      // Mise à jour optimiste de l'interface
      if (order.items) {
        const updatedItems = order.items.filter(item => item.id !== itemId);
        setOrder({
          ...order,
          items: updatedItems
        });
      }
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'article')
      
      // Recharger la commande après un court délai pour s'assurer que les changements sont pris en compte
      setTimeout(() => {
        fetchOrder(order.id)
      }, 300)
      
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
      
      // En cas d'erreur, recharger pour restaurer l'état correct
      fetchOrder(order.id)
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
      
      // Mise à jour optimiste de l'interface
      if (order.bookings) {
        const updatedBookings = order.bookings.filter(booking => booking.id !== bookingId);
        setOrder({
          ...order,
          bookings: updatedBookings
        });
      }
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de l\'annulation de la réservation')
      
      // Recharger complètement la commande pour assurer la cohérence
      const orderResponse = await fetch(`/api/orders/${order.id}`);
      if (orderResponse.ok) {
        const updatedOrder = await orderResponse.json();
        
        // Si la commande est vide (plus d'articles ni de réservations), supprimer l'ID du localStorage
        if ((!updatedOrder.items || updatedOrder.items.length === 0) && 
            (!updatedOrder.bookings || updatedOrder.bookings.length === 0)) {
          localStorage.removeItem('currentOrderId');
          // Rediriger vers la page du panier vide
          router.refresh();
        } else {
          // Sinon, mettre à jour l'état local
          setOrder(updatedOrder);
        }
      }
      
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
      
      // En cas d'erreur, recharger pour restaurer l'état correct
      fetchOrder(order.id)
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

  // Helper function pour gérer les dates et les états de réservation en toute sécurité
  const getExpiryInfo = (booking: Booking | undefined) => {
    if (!booking || !booking.expiresAt) {
      return { isExpiring: false, timeRemaining: null };
    }
    const expiryDate = new Date(booking.expiresAt);
    const timeRemaining = Math.max(0, Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60)));
    return {
      isExpiring: booking.status === 'TEMPORARY' && booking.expiresAt,
      timeRemaining
    };
  };

  // Filtrer les réservations non annulées et non expirées
  const validBookings = order?.bookings?.filter(booking => {
    // Ne pas afficher les réservations déjà annulées
    if (booking.status === 'CANCELLED') return false;
    
    // Vérifier si la réservation est temporaire et expirée
    if (booking.status === 'TEMPORARY' && booking.expiresAt) {
      const expiryDate = new Date(booking.expiresAt);
      return expiryDate > new Date(); // Garder seulement les non-expirées
    }
    
    return true;
  }) || [];

  // Calcul du total pour les produits standards (non-frais)
  const regularItemsTotal = order?.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0) || 0

  // Calcul du total pour les réservations avec le prix du produit
  const bookingsTotal = validBookings.reduce((sum, booking) => {
    // Utiliser le prix de la réservation ou le prix du produit associé
    const price = booking.price || booking.deliverySlot.product.price || 0;
    return sum + (price * booking.quantity);
  }, 0) || 0;

  // Total général
  const grandTotal = regularItemsTotal + bookingsTotal

  // Vérifier si le panier est vide
  const isCartEmpty = !order || (
    (!order.items || order.items.length === 0) && 
    (validBookings.length === 0)
  )

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
            {order?.items && order.items.length > 0 && (
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
            {validBookings.length > 0 && (
              <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-foreground/10">
                  <h2 className="font-semibold">Réservations de Livraison</h2>
                </div>
                
                <div className="divide-y divide-foreground/10">
                  {validBookings.map((booking) => {
                    console.log("Traitement d'une réservation:", booking);
                    
                    // Vérifier si booking et deliverySlot sont définis
                    if (!booking || !booking.deliverySlot) {
                      console.log("Booking ou deliverySlot manquant:", booking);
                      return null;
                    }
                    
                    // Créer une date à partir de la chaîne
                    const deliveryDate = booking.deliverySlot.date ? new Date(booking.deliverySlot.date) : null;
                    if (!deliveryDate) {
                      console.log("Date de livraison invalide:", booking.deliverySlot.date);
                      return null;
                    }
                    
                    const { isExpiring, timeRemaining } = getExpiryInfo(booking);
                    
                    // Calculer le prix de la réservation
                    const bookingPrice = booking.price || booking.deliverySlot.product.price || 0;
                    const bookingTotal = bookingPrice * booking.quantity;
                    
                    return (
                      <div key={booking.id} className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Image du produit */}
                          <div className="w-16 h-16 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0 mr-4">
                            {booking.deliverySlot.product.image ? (
                              <img
                                src={booking.deliverySlot.product.image}
                                alt={booking.deliverySlot.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                                <Calendar className="h-8 w-8" />
                              </div>
                            )}
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
                              <span className="ml-1 font-medium">
                                ({bookingTotal.toFixed(2)} CHF)
                              </span>
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
            
            {/* Section de débogage (en mode développement uniquement) */}
            {process.env.NODE_ENV === 'development' && debug && (
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mt-8">
                <h3 className="font-bold mb-2">Débogage</h3>
                <div className="overflow-auto max-h-96">
                  <div className="mb-2">
                    <p className="font-medium">État des réservations:</p>
                    <ul className="list-disc list-inside">
                      {order?.bookings?.map(booking => (
                        <li key={booking.id}>
                          ID: {booking.id.substring(0, 8)} | 
                          Status: {booking.status} | 
                          Expire: {booking.expiresAt ? new Date(booking.expiresAt).toLocaleString() : 'N/A'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <pre className="text-xs">{JSON.stringify(debug, null, 2)}</pre>
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
                  <span>{(regularItemsTotal + bookingsTotal).toFixed(2)} CHF</span>
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