// app/(protected)/checkout/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatDateToFrench } from '@/lib/date-utils'
import { 
  CreditCard, 
  CheckCircle, 
  ShoppingCart, 
  Building, 
  Truck, 
  CalendarDays,
  ArrowLeft,
  Calendar,
  Trash2,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface CheckoutProps {
  params: {
    id: string
  }
}

interface CartItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    image: string | null
  }
}

interface Booking {
  id: string
  quantity: number
  price?: number
  deliverySlot: {
    date: string
    product: {
      name: string
      unit: string
      price: number
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

export default function CheckoutPage({ params }: CheckoutProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'card'>('invoice')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id)
    }
  }, [params.id])
  
  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true)
      
      // Nettoyer les réservations expirées
      await fetch('/api/bookings/cleanup', { method: 'POST' });
      
      const response = await fetch(`/api/orders/${orderId}`, {
        // Éviter la mise en cache du navigateur
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/cart')
          return
        }
        throw new Error('Erreur lors de la récupération de la commande')
      }
      
      const data = await response.json()
      
      // Vérifier si la commande n'est pas vide
      if ((!data.items || data.items.length === 0) && (!data.bookings || data.bookings.length === 0)) {
        toast({
          title: "Panier vide",
          description: "Votre panier est vide. Ajoutez des produits avant de passer commande.",
          variant: "destructive"
        })
        router.push('/cart')
        return
      }
      
      setOrder(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails de votre commande',
        variant: 'destructive'
      })
      router.push('/cart')
    } finally {
      setIsLoading(false)
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
      
      toast({
        title: 'Article supprimé',
        description: 'L\'article a été supprimé de votre panier'
      })
      
      // Rediriger vers le panier pour une synchronisation complète
      window.location.href = '/cart';
      
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
      
      toast({
        title: 'Réservation annulée',
        description: 'La réservation a été annulée avec succès'
      })
      
      // Rediriger vers le panier pour une synchronisation complète
      window.location.href = '/cart';
      
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
  
  const handleCheckout = async () => {
    if (!order) return
    
    try {
      setIsProcessing(true)
      
      // Créer les données de la commande finalisée
      const checkoutData = {
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : null,
        deliveryNotes,
        paymentMethod
      }
      
      // Appeler l'API pour finaliser la commande
      const response = await fetch(`/api/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la finalisation de la commande')
      }
      
      // Supprimer l'ID de commande du localStorage
      localStorage.removeItem('currentOrderId')
      
      // Rediriger vers la page de confirmation
      router.push(`/confirmation/${order.id}`)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de finaliser votre commande',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Calcul des totaux
  const subtotal = order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
  
  // Calcul du total des réservations
  const bookingsTotal = order?.bookings?.reduce((sum, booking) => {
    // Utiliser le prix stocké dans la réservation ou le prix du produit associé
    const price = booking.price || booking.deliverySlot.product.price || 0;
    return sum + (price * booking.quantity);
  }, 0) || 0;
  
  const deliveryFee = deliveryType === 'delivery' ? 15 : 0
  const total = subtotal + bookingsTotal + deliveryFee
  
  // Formater les dates de livraison
  const getDeliveryDates = () => {
    if (!order?.bookings?.length) return null
    
    const dates = order.bookings.map(booking => {
      const date = new Date(booking.deliverySlot.date)
      return {
        date,
        formattedDate: formatDateToFrench(date),
        product: booking.deliverySlot.product.name
      }
    })
    
    return dates.sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  
  const deliveryDates = getDeliveryDates()
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/cart" 
          className="flex items-center text-custom-text hover:text-custom-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au panier
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-8">Finaliser votre commande</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informations de commande */}
        <div className="lg:col-span-2 space-y-6">
          {/* Méthode de livraison */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Méthode de livraison
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  id="pickup"
                  type="radio"
                  name="deliveryType"
                  value="pickup"
                  checked={deliveryType === 'pickup'}
                  onChange={() => setDeliveryType('pickup')}
                  className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <div className="flex-1">
                  <label htmlFor="pickup" className="font-medium">Retrait sur place</label>
                  <p className="text-sm text-muted-foreground">
                    Venez chercher votre commande directement chez le producteur.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  id="delivery"
                  type="radio"
                  name="deliveryType"
                  value="delivery"
                  checked={deliveryType === 'delivery'}
                  onChange={() => setDeliveryType('delivery')}
                  className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <div className="flex-1">
                  <label htmlFor="delivery" className="font-medium">Livraison à domicile</label>
                  <p className="text-sm text-muted-foreground">
                    Recevez votre commande à l'adresse de votre choix (+15 CHF).
                  </p>
                </div>
              </div>
              
              {/* Adresse de livraison (conditionnelle) */}
              {deliveryType === 'delivery' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg">
                  <label htmlFor="deliveryAddress" className="block mb-2 text-sm font-medium">
                    Adresse de livraison
                  </label>
                  <textarea
                    id="deliveryAddress"
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Nom, rue, numéro, code postal, ville"
                    className="w-full p-2 border border-foreground/10 rounded-md bg-background"
                    required={deliveryType === 'delivery'}
                  ></textarea>
                </div>
              )}
              
              {/* Notes de livraison */}
              <div className="mt-4">
                <label htmlFor="deliveryNotes" className="block mb-2 text-sm font-medium">
                  Instructions spéciales (optionnel)
                </label>
                <textarea
                  id="deliveryNotes"
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Instructions particulières pour la livraison ou le retrait"
                  className="w-full p-2 border border-foreground/10 rounded-md bg-background"
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Dates de livraison */}
          {order?.bookings && order.bookings.length > 0 && (
            <div className="bg-background border border-foreground/10 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2" />
                Dates de livraison
              </h2>
              
              <div className="space-y-3">
                {order?.bookings?.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-foreground/5 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-custom-accent/10 flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-custom-accent" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatDateToFrench(new Date(booking.deliverySlot.date))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.quantity} {booking.deliverySlot.product.unit} de {booking.deliverySlot.product.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bouton supprimer */}
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
                ))}
              </div>
            </div>
          )}
          
          {/* Méthode de paiement */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Méthode de paiement
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  id="invoice"
                  type="radio"
                  name="paymentMethod"
                  value="invoice"
                  checked={paymentMethod === 'invoice'}
                  onChange={() => setPaymentMethod('invoice')}
                  className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <div className="flex-1">
                  <label htmlFor="invoice" className="font-medium">Facturation</label>
                  <p className="text-sm text-muted-foreground">
                    Recevez une facture à payer par virement bancaire sous 30 jours.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  id="card"
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <div className="flex-1">
                  <label htmlFor="card" className="font-medium">Carte de crédit</label>
                  <p className="text-sm text-muted-foreground">
                    Paiement sécurisé par carte bancaire.
                  </p>
                </div>
              </div>
              
              {paymentMethod === 'card' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    Note: Dans cette version de démonstration, le paiement par carte n'est pas implémenté.
                    Vous ne serez pas débité.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Résumé de la commande */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Résumé de la commande</h2>
            
            {/* Articles */}
            <div className="mb-4 space-y-3">
              {order?.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {/* Miniature du produit */}
                    <div className="w-8 h-8 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span>
                      {item.quantity} × {item.product.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">{(item.price * item.quantity).toFixed(2)} CHF</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isUpdating}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Supprimer l'article"
                    >
                      {updatingItemId === item.id && isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              
              {order?.bookings?.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {/* Miniature du produit de réservation */}
                    <div className="w-8 h-8 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                      {booking.deliverySlot.product.image ? (
                        <img
                          src={booking.deliverySlot.product.image}
                          alt={booking.deliverySlot.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                          <Calendar className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span>
                      {booking.quantity} kg × {booking.deliverySlot.product.name} (livraison)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">{((booking.price || booking.deliverySlot.product.price) * booking.quantity).toFixed(2)} CHF</span>
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      disabled={isUpdating}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Annuler la réservation"
                    >
                      {updatingItemId === booking.id && isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Sous-total */}
            <div className="space-y-2 mb-4 pt-3 border-t border-foreground/10">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{(subtotal + bookingsTotal).toFixed(2)} CHF</span>
              </div>
              
              <div className="flex justify-between">
                <span>Frais de livraison</span>
                <span>{deliveryFee.toFixed(2)} CHF</span>
              </div>
            </div>
            
            {/* Total */}
            <div className="border-t border-foreground/10 pt-3 mb-6">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)} CHF</span>
              </div>
            </div>
            
            {/* Bouton de commande */}
            <LoadingButton
              onClick={handleCheckout}
              isLoading={isProcessing}
              disabled={
                (deliveryType === 'delivery' && !deliveryAddress) || 
                isProcessing ||
                isUpdating
              }
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Confirmer la commande
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  )
}