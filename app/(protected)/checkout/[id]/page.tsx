// app/(protected)/checkout/[id]/page.tsx - VERSION COMPLÈTE CORRIGÉE SANS COMMISSION VISIBLE POUR LE CLIENT
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form'
import { BankTransferForm } from '@/components/checkout/bank-transfer-form'
import { getCommissionBreakdown, type CommissionBreakdown } from '@/lib/commission-utils'
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
  Loader2,
  CreditCard as CardIcon,
  Clock,
  AlertCircle,
  Info,
  DollarSign,
  Receipt,
  Banknote
} from 'lucide-react'
import Link from 'next/link'

interface CheckoutProps {
  params: {
    id: string
  }
}

type PaymentMethodType = 'invoice' | 'card' | 'bank_transfer'

interface CartItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    image: string | null
    acceptDeferred?: boolean
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
      acceptDeferred?: boolean
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

interface DeliveryFormData {
  fullName: string
  company: string
  address: string
  postalCode: string
  city: string
  phone: string
  notes: string
}

export default function CheckoutPage({ params }: CheckoutProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryFormData>({
    fullName: '',
    company: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    notes: ''
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('invoice')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // CORRECTION : Calculs de commission avec frais de livraison
  const commissionBreakdown = useMemo((): (CommissionBreakdown & { deliveryFee: number; grandTotal: number }) | null => {
    if (!order) return null
    
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const bookingsTotal = order.bookings.reduce((sum, booking) => {
      const price = booking.price || booking.deliverySlot.product.price || 0
      return sum + (price * booking.quantity)
    }, 0)
    
    const subtotal = itemsTotal + bookingsTotal
    const deliveryFee = deliveryType === 'delivery' ? 15 : 0
    
    // CORRECTION : Le client paie seulement subtotal + frais de livraison
    // La commission est une répartition interne, pas un coût supplémentaire
    const grandTotal = subtotal + deliveryFee
    
    // Calcul de la commission pour la répartition interne (non visible au client)
    const breakdown = getCommissionBreakdown(subtotal)
    
    return {
      ...breakdown,
      deliveryFee,
      grandTotal // = subtotal + deliveryFee (PAS + commission)
    }
  }, [order, deliveryType])
  
  // Vérifier si tous les produits acceptent le paiement différé
  const allProductsAcceptDeferred = useMemo(() => {
    if (!order) return false
    
    const allItemsAcceptDeferred = order.items.every(item => 
      item.product.acceptDeferred === true
    )
    
    const allBookingsAcceptDeferred = order.bookings.every(booking => 
      booking.deliverySlot.product.acceptDeferred === true
    )
    
    return allItemsAcceptDeferred && allBookingsAcceptDeferred
  }, [order])
  
  // Définir le mode de paiement par défaut
  useEffect(() => {
    if (!allProductsAcceptDeferred) {
      setPaymentMethod('card')
    }
  }, [allProductsAcceptDeferred])
  
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
  
  // Gérer les changements dans le formulaire de livraison
  const handleDeliveryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeliveryFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Nettoyer l'erreur si le champ est rempli
    if (value.trim() !== '') {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
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

  // Validation du formulaire de livraison
  const validateDeliveryForm = (): boolean => {
    if (deliveryType !== 'delivery') return true
    
    const errors: Record<string, string> = {};
    const requiredFields: (keyof DeliveryFormData)[] = ['fullName', 'address', 'postalCode', 'city', 'phone'];
    
    for (const field of requiredFields) {
      if (!deliveryFormData[field] || deliveryFormData[field].trim() === '') {
        errors[field] = 'Ce champ est obligatoire';
      }
    }

    // Validation du code postal (format suisse)
    if (deliveryFormData.postalCode && !/^\d{4}$/.test(deliveryFormData.postalCode)) {
      errors.postalCode = 'Code postal invalide (format: 1234)';
    }

    // Validation du numéro de téléphone
    if (deliveryFormData.phone && !/^(\+\d{1,3}\s?)?(\d{2,3}\s?){2,4}\d{2,3}$/.test(deliveryFormData.phone)) {
      errors.phone = 'Numéro de téléphone invalide';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }
  
  // Gestion du paiement par carte Stripe
  const handleStripePaymentSuccess = async (paymentIntent: any) => {
    if (!order || !commissionBreakdown) return
    
    try {
      // Finaliser la commande avec le paiement confirmé
      await finalizeOrder('card', paymentIntent.id)
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la finalisation de la commande',
        variant: 'destructive'
      })
    }
  }

  const handleStripePaymentError = (error: string) => {
    toast({
      title: 'Erreur de paiement',
      description: error,
      variant: 'destructive'
    })
  }

  // Gestion du virement bancaire
  const handleBankTransferConfirm = async () => {
    if (!order || !commissionBreakdown) return
    
    try {
      await finalizeOrder('bank_transfer')
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la confirmation du virement',
        variant: 'destructive'
      })
    }
  }

  // Finaliser la commande
  const finalizeOrder = async (method: PaymentMethodType, paymentIntentId?: string) => {
    if (!order || !commissionBreakdown) return

    if (!validateDeliveryForm()) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true)
      
      const checkoutData = {
        deliveryType,
        deliveryInfo: deliveryType === 'delivery' ? deliveryFormData : null,
        paymentMethod: method,
        paymentStatus: method === 'invoice' ? 'PENDING' : 'PAID',
        paymentIntentId,
        commission: commissionBreakdown
      }
      
      const response = await fetch(`/api/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      })
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Erreur lors de la finalisation de la commande');
      }
      
      // Supprimer l'ID de commande du localStorage
      localStorage.removeItem('currentOrderId')
      
      // Déclencher un événement pour vider le panier dans la navigation
      window.dispatchEvent(new CustomEvent('cart:cleared'))
      
      // Déclencher aussi l'événement cart:updated pour s'assurer que tous les composants se mettent à jour
      window.dispatchEvent(new CustomEvent('cart:updated'))
      
      // Rediriger vers la page de confirmation
      router.push(`/confirmation/${order.id}`)
    } catch (error) {
      console.error('Erreur:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Gestion du checkout traditionnel (facture)
  const handleTraditionalCheckout = async () => {
    if (!order || !commissionBreakdown) return
    await finalizeOrder('invoice')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!commissionBreakdown) {
    return (
      <div className="text-center p-8">
        <p>Erreur lors du calcul des montants</p>
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
              
              {/* Formulaire d'adresse de livraison */}
              {deliveryType === 'delivery' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg space-y-4">
                  <h3 className="font-medium text-sm mb-2">Coordonnées de livraison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fullName" className="block mb-1 text-sm font-medium">
                        Nom complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={deliveryFormData.fullName}
                        onChange={handleDeliveryFormChange}
                        className={`w-full p-2 border ${formErrors.fullName ? 'border-red-500' : 'border-foreground/10'} rounded-md bg-background`}
                        placeholder="Jean Dupont"
                      />
                      {formErrors.fullName && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="company" className="block mb-1 text-sm font-medium">
                        Entreprise <span className="text-muted-foreground">(optionnel)</span>
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        value={deliveryFormData.company}
                        onChange={handleDeliveryFormChange}
                        className="w-full p-2 border border-foreground/10 rounded-md bg-background"
                        placeholder="Nom de l'entreprise"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block mb-1 text-sm font-medium">
                        Adresse <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={deliveryFormData.address}
                        onChange={handleDeliveryFormChange}
                        className={`w-full p-2 border ${formErrors.address ? 'border-red-500' : 'border-foreground/10'} rounded-md bg-background`}
                        placeholder="Rue et numéro"
                      />
                      {formErrors.address && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block mb-1 text-sm font-medium">
                        Code postal <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="postalCode"
                        name="postalCode"
                        type="text"
                        value={deliveryFormData.postalCode}
                        onChange={handleDeliveryFormChange}
                        className={`w-full p-2 border ${formErrors.postalCode ? 'border-red-500' : 'border-foreground/10'} rounded-md bg-background`}
                        placeholder="1234"
                      />
                      {formErrors.postalCode && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.postalCode}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="city" className="block mb-1 text-sm font-medium">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        value={deliveryFormData.city}
                        onChange={handleDeliveryFormChange}
                        className={`w-full p-2 border ${formErrors.city ? 'border-red-500' : 'border-foreground/10'} rounded-md bg-background`}
                        placeholder="Lausanne"
                      />
                      {formErrors.city && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="phone" className="block mb-1 text-sm font-medium">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={deliveryFormData.phone}
                        onChange={handleDeliveryFormChange}
                        className={`w-full p-2 border ${formErrors.phone ? 'border-red-500' : 'border-foreground/10'} rounded-md bg-background`}
                        placeholder="+41 79 123 45 67"
                      />
                      {formErrors.phone && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="notes" className="block mb-1 text-sm font-medium">
                        Instructions de livraison <span className="text-muted-foreground">(optionnel)</span>
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        value={deliveryFormData.notes}
                        onChange={handleDeliveryFormChange}
                        placeholder="Instructions particulières pour la livraison"
                        className="w-full p-2 border border-foreground/10 rounded-md bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}
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
                {order.bookings.map((booking) => (
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
            
            {!allProductsAcceptDeferred && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Certains produits de votre panier n'acceptent pas le paiement différé
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Le paiement immédiat est requis pour cette commande.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Paiement différé (facture) */}
              {allProductsAcceptDeferred && (
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
                    <label htmlFor="invoice" className="font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Paiement à 30 jours
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Recevez une facture à régler dans un délai de 30 jours.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Paiement par carte */}
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
                  <label htmlFor="card" className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Carte de crédit
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Paiement sécurisé par carte bancaire. Règlement immédiat.
                  </p>
                </div>
              </div>

              {/* Virement bancaire */}
              <div className="flex items-start space-x-3">
                <input
                  id="bank_transfer"
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={() => setPaymentMethod('bank_transfer')}
                  className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <div className="flex-1">
                  <label htmlFor="bank_transfer" className="font-medium flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Virement bancaire
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Payez par virement bancaire. Commande traitée après réception.
                  </p>
                </div>
              </div>
              
              {/* Interface de paiement conditionnelle */}
              {paymentMethod === 'card' && order && commissionBreakdown && (
                <div className="mt-6 p-4 bg-foreground/5 rounded-lg">
                  <StripePaymentForm
                    amount={commissionBreakdown.grandTotal}
                    orderId={order.id}
                    onSuccess={handleStripePaymentSuccess}
                    onError={handleStripePaymentError}
                  />
                </div>
              )}

              {paymentMethod === 'bank_transfer' && order && commissionBreakdown && (
                <div className="mt-6 p-4 bg-foreground/5 rounded-lg">
                  <BankTransferForm
                    amount={commissionBreakdown.grandTotal}
                    orderId={order.id}
                    onConfirm={handleBankTransferConfirm}
                    isLoading={isProcessing}
                  />
                </div>
              )}

              {paymentMethod === 'invoice' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      Les factures impayées seront accessibles dans votre espace "Mes factures" et doivent être réglées dans les 30 jours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* RÉSUMÉ DE LA COMMANDE - VERSION CORRIGÉE SANS COMMISSION VISIBLE */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Résumé de la commande</h2>
            
            {/* Articles */}
            <div className="mb-4 space-y-3">
              {order?.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
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
                      {booking.quantity} {booking.deliverySlot.product.unit} × {booking.deliverySlot.product.name} (livraison)
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
            
            {/* DÉTAIL DE LA COMMANDE - VERSION SIMPLIFIÉE POUR LE CLIENT */}
            <div className="border-t border-foreground/10 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total produits</span>
                <span>{commissionBreakdown.subtotal.toFixed(2)} CHF</span>
              </div>
              
              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span>Frais de livraison</span>
                  <span>{commissionBreakdown.deliveryFee.toFixed(2)} CHF</span>
                </div>
              )}
              
              <div className="flex justify-between font-semibold text-lg border-t border-foreground/10 pt-2">
                <span>Total à payer</span>
                <span>{commissionBreakdown.grandTotal.toFixed(2)} CHF</span>
              </div>
              
              {/* Information optionnelle sur la plateforme (si vous voulez être transparent) */}
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    Plateforme transparente
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Vos achats soutiennent directement les producteurs locaux. 
                  Une petite commission aide à maintenir la plateforme.
                </p>
              </div>
              
              {paymentMethod === 'invoice' && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>À régler dans les 30 jours suivant la commande</span>
                </div>
              )}
            </div>
            
            {/* Bouton de commande conditionnel */}
            {paymentMethod === 'invoice' && (
              <LoadingButton
                onClick={handleTraditionalCheckout}
                isLoading={isProcessing}
                disabled={isProcessing || isUpdating || !validateDeliveryForm()}
                className="w-full flex items-center justify-center gap-2 mt-6"
              >
                <Receipt className="h-5 w-5" />
                Commander et recevoir la facture
              </LoadingButton>
            )}

            {(paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (
              <div className="text-sm text-muted-foreground text-center mt-6">
                Utilisez le formulaire de paiement ci-dessus pour finaliser votre commande.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}