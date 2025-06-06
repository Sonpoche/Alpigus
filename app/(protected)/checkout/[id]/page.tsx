// app/(protected)/checkout/[id]/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Loader2,
  CreditCard as CardIcon,
  Clock,
  AlertCircle
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
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'card'>('invoice')
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Vérifier si tous les produits acceptent le paiement différé
  const allProductsAcceptDeferred = useMemo(() => {
    if (!order) return false;
    
    // Vérifier tous les articles standards
    const allItemsAcceptDeferred = order.items.every(item => 
      item.product.acceptDeferred === true
    );
    
    // Vérifier aussi les réservations/livraisons
    const allBookingsAcceptDeferred = order.bookings.every(booking => 
      booking.deliverySlot.product.acceptDeferred === true
    );
    
    return allItemsAcceptDeferred && allBookingsAcceptDeferred;
  }, [order]);
  
  // Définir le mode de paiement par défaut en fonction des produits
  useEffect(() => {
    if (!allProductsAcceptDeferred) {
      setPaymentMethod('card');
    }
  }, [allProductsAcceptDeferred]);
  
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

  // Valider le formulaire de livraison
  const validateDeliveryForm = (): boolean => {
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
  
    // Ne modifiez l'état que lorsque la fonction est explicitement appelée par un gestionnaire d'événements
    if (Object.keys(errors).length > 0) {
      return false;
    }
    
    return true;
  }
  
  // Ensuite dans handleCheckout, mettez à jour les erreurs explicitement
  const handleCheckout = async () => {
    if (!order) return
  
    // Si livraison à domicile, valider le formulaire
    if (deliveryType === 'delivery') {
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
      
      if (Object.keys(errors).length > 0) {
        toast({
          title: "Formulaire incomplet",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      setIsProcessing(true)
      
      // Créer les données de la commande finalisée
      const checkoutData = {
        deliveryType,
        deliveryInfo: deliveryType === 'delivery' ? deliveryFormData : null,
        paymentMethod,
        paymentStatus: paymentMethod === 'invoice' ? 'PENDING' : 'PAID'
      }
      
      // Appeler l'API pour finaliser la commande
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
      
      // Rediriger vers la page de confirmation
      router.push(`/confirmation/${order.id}`)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de finaliser votre commande',
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
              
              {/* Formulaire d'adresse de livraison (conditionnel) */}
              {deliveryType === 'delivery' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg space-y-4">
                  <h3 className="font-medium text-sm mb-2">Coordonnées de livraison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom complet */}
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
                    
                    {/* Entreprise (optionnelle) */}
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
                    
                    {/* Adresse */}
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
                    
                    {/* Code postal */}
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
                    
                    {/* Ville */}
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
                    
                    {/* Téléphone */}
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
                  </div>

                  {/* Instructions de livraison */}
                  <div className="mt-4">
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
                    ></textarea>
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
            
            {!allProductsAcceptDeferred && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Certains produits de votre panier n'acceptent pas le paiement sous 30 jours
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Seul le paiement par carte est disponible pour cette commande.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
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
                    <label htmlFor="invoice" className="font-medium">Paiement à 30 jours</label>
                    <p className="text-sm text-muted-foreground">
                      Recevez une facture à régler dans un délai de 30 jours. Les factures impayées seront visibles dans votre espace client.
                    </p>
                  </div>
                </div>
              )}
              
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
                    Paiement sécurisé par carte bancaire. Règlement immédiat.
                  </p>
                </div>
              </div>
              
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
              
              {paymentMethod === 'card' && (
                <div className="mt-4 p-4 bg-foreground/5 rounded-lg">
                  <div className="flex gap-2 items-center mb-3">
                    <CardIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium">Informations de paiement</p>
                  </div>
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
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{total.toFixed(2)} CHF</span>
              </div>
              
              {paymentMethod === 'invoice' && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>À régler dans les 30 jours suivant la commande</span>
                </div>
              )}
            </div>
            
            {/* Bouton de commande */}
            <LoadingButton
              onClick={handleCheckout}
              isLoading={isProcessing}
              disabled={
                (deliveryType === 'delivery' && 
                 Object.values(deliveryFormData).some(value => !value && value !== '') && 
                 Object.values(formErrors).some(error => error !== '')) || 
                isProcessing ||
                isUpdating
              }
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              {paymentMethod === 'invoice' 
                ? "Commander et payer plus tard" 
                : "Commander et payer maintenant"}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  )
}