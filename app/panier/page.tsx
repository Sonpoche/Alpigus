// Chemin du fichier: app/panier/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useLocalCart, CartItem } from '@/hooks/use-local-cart'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ShoppingBag, Plus, Minus, ShoppingCart, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { formatNumber } from '@/lib/number-utils'
import { formatDateToFrench } from '@/lib/date-utils'

// Types pour la version connectée
interface ServerCartItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    type: string
    image: string | null
  }
}

interface Booking {
  id: string
  quantity: number
  price?: number
  status: 'TEMPORARY' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  expiresAt: string | null
  deliverySlot: {
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
}

interface ServerOrder {
  id: string
  items: ServerCartItem[]
  bookings: Booking[]
  total: number
  status: string
}

export default function CartPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  
  // État pour la version connectée
  const [serverOrder, setServerOrder] = useState<ServerOrder | null>(null)
  const [isLoadingServer, setIsLoadingServer] = useState(false)
  
  // État pour la version locale (non connectée)
  const localItems = useLocalCart((state) => state.items)
  const updateLocalQuantity = useLocalCart((state) => state.updateQuantity)
  const removeLocalItem = useLocalCart((state) => state.removeItem)
  const clearLocalCart = useLocalCart((state) => state.clearCart)
  const getLocalTotalPrice = useLocalCart((state) => state.getTotalPrice)

  // Hydrater le store après le montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
    setMounted(true)
  }, [])

  // Charger les données serveur si connecté
  useEffect(() => {
    if (session && mounted) {
      fetchServerOrder()
    }
  }, [session, mounted])

  const fetchServerOrder = async () => {
    const currentOrderId = localStorage.getItem('currentOrderId')
    if (!currentOrderId) {
      setIsLoadingServer(false)
      return
    }

    try {
      setIsLoadingServer(true)
      
      // Nettoyage des réservations expirées
      await fetch('/api/bookings/cleanup', { method: 'POST' })
      
      const response = await fetch(`/api/orders/${currentOrderId}`, {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem('currentOrderId')
          setServerOrder(null)
          return
        }
        throw new Error('Erreur lors de la récupération de la commande')
      }
      
      const data = await response.json()
      setServerOrder(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger votre panier',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingServer(false)
    }
  }

  // Si pas encore monté, afficher un loader
  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  // Gestion du checkout
  const handleCheckout = async () => {
    if (status === 'loading') return

    if (!session) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour finaliser votre commande"
      })
      router.push('/connexion?callbackUrl=/panier&checkout=true')
      return
    }

    // Si connecté avec commande serveur
    if (serverOrder) {
      router.push(`/commande/${serverOrder.id}`)
      return
    }

    // Si connecté mais panier local, synchroniser d'abord
    try {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localItems })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/commande/${data.orderId}`)
      } else {
        throw new Error('Erreur de synchronisation')
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser le panier",
        variant: "destructive"
      })
    }
  }

  // Gestion des quantités (version connectée)
  const updateServerItemQuantity = async (itemId: string, newQuantity: number) => {
    if (!serverOrder) return
    
    try {
      setUpdatingItemId(itemId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      
      if (!response.ok) throw new Error('Erreur lors de la mise à jour')
      
      setTimeout(() => {
        fetchServerOrder()
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
      fetchServerOrder()
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Supprimer un article (version connectée)
  const removeServerItem = async (itemId: string) => {
    if (!serverOrder) return
    
    try {
      setUpdatingItemId(itemId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de la suppression')
      
      setTimeout(() => {
        fetchServerOrder()
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
      fetchServerOrder()
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Annuler une réservation
  const cancelBooking = async (bookingId: string) => {
    if (!serverOrder) return
    
    try {
      setUpdatingItemId(bookingId)
      setIsUpdating(true)
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de l\'annulation')
      
      const orderResponse = await fetch(`/api/orders/${serverOrder.id}`)
      if (orderResponse.ok) {
        const updatedOrder = await orderResponse.json()
        
        if ((!updatedOrder.items || updatedOrder.items.length === 0) && 
            (!updatedOrder.bookings || updatedOrder.bookings.length === 0)) {
          localStorage.removeItem('currentOrderId')
          router.refresh()
        } else {
          setServerOrder(updatedOrder)
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
      fetchServerOrder()
    } finally {
      setIsUpdating(false)
      setUpdatingItemId(null)
    }
  }

  // Gestion des quantités (version locale)
  const handleLocalQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeLocalItem(productId)
      toast({
        title: "Produit retiré",
        description: "Le produit a été retiré du panier"
      })
    } else {
      updateLocalQuantity(productId, newQuantity)
    }
  }

  const handleLocalRemoveItem = (productId: string, productName: string) => {
    removeLocalItem(productId)
    toast({
      title: "Produit retiré",
      description: `${productName} a été retiré du panier`
    })
  }

  const handleClearCart = () => {
    if (session && serverOrder) {
      // Pour la version connectée, on pourrait implémenter la suppression côté serveur
      toast({
        title: "Information",
        description: "Supprimez les articles individuellement pour vider le panier"
      })
    } else {
      clearLocalCart()
      toast({
        title: "Panier vidé",
        description: "Tous les produits ont été retirés du panier"
      })
    }
  }

  // Helper pour l'expiration des réservations
  const getExpiryInfo = (booking: Booking) => {
    if (!booking.expiresAt) return { isExpiring: false, timeRemaining: null }
    
    const expiryDate = new Date(booking.expiresAt)
    const timeRemaining = Math.max(0, Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60)))
    return {
      isExpiring: booking.status === 'TEMPORARY' && booking.expiresAt,
      timeRemaining
    }
  }

  // Déterminer quelles données utiliser
  const isConnected = !!session
  const items = isConnected && serverOrder ? serverOrder.items : localItems
  const bookings = isConnected && serverOrder ? serverOrder.bookings?.filter(b => 
    b.status !== 'CANCELLED' && 
    (!b.expiresAt || new Date(b.expiresAt) > new Date())
  ) || [] : []
  
  // Calculs des totaux
  const regularItemsTotal = isConnected && serverOrder ? 
    serverOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) :
    getLocalTotalPrice()
  
  const bookingsTotal = bookings.reduce((sum, booking) => {
    const price = booking.price || booking.deliverySlot.product.price || 0
    return sum + (price * booking.quantity)
  }, 0)
  
  const grandTotal = regularItemsTotal + bookingsTotal
  const isCartEmpty = (!items || items.length === 0) && bookings.length === 0

  if (isLoadingServer && isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-black">
          <ShoppingCart className="h-6 w-6" />
          Votre Panier
        </h1>

        {isCartEmpty ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2 text-black">Votre panier est vide</h2>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore ajouté de produits à votre panier.</p>
            <Link 
              href="/" 
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Découvrir nos produits
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne principale avec les produits */}
            <div className="lg:col-span-2 space-y-6">
              {/* Produits standards */}
              {items && items.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h2 className="font-semibold text-black">Produits ({items.length})</h2>
                      <button
                        onClick={handleClearCart}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                      >
                        Vider le panier
                      </button>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {items.map((item: any) => {
                      const isServerItem = 'product' in item
                      const productId = isServerItem ? item.id : item.productId
                      const productName = isServerItem ? item.product.name : item.productName
                      const productUnit = isServerItem ? item.product.unit : item.unit
                      const productImage = isServerItem ? item.product.image : item.image
                      const price = item.price
                      const quantity = item.quantity

                      return (
                        <div key={productId} className="p-4 flex items-center">
                          {/* Image du produit */}
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-4">
                            {productImage ? (
                              <Image
                                src={productImage}
                                alt={productName}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ShoppingBag className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          
                          {/* Informations du produit */}
                          <div className="flex-1">
                            <div className="font-medium text-black">
                              {productName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatNumber ? formatNumber(price) : price.toFixed(2)} CHF / {productUnit}
                            </div>
                          </div>
                          
                          {/* Contrôles de quantité */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center">
                              <button
                                onClick={() => {
                                  if (isServerItem) {
                                    updateServerItemQuantity(productId, Math.max(0.1, quantity - 0.1))
                                  } else {
                                    handleLocalQuantityChange(productId, quantity - 1)
                                  }
                                }}
                                disabled={isUpdating}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-l-lg hover:bg-gray-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                value={formatNumber ? formatNumber(quantity) : quantity.toFixed(1)}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value)
                                  if (!isNaN(value) && value > 0) {
                                    if (isServerItem) {
                                      updateServerItemQuantity(productId, value)
                                    } else {
                                      handleLocalQuantityChange(productId, value)
                                    }
                                  }
                                }}
                                min="0.1"
                                step="0.1"
                                className="w-16 h-8 border-y border-gray-300 text-center bg-white text-black"
                              />
                              <button
                                onClick={() => {
                                  if (isServerItem) {
                                    updateServerItemQuantity(productId, quantity + 0.1)
                                  } else {
                                    handleLocalQuantityChange(productId, quantity + 1)
                                  }
                                }}
                                disabled={isUpdating}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-r-lg hover:bg-gray-50"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Sous-total */}
                            <div className="w-24 text-right font-medium text-black">
                              {formatNumber ? formatNumber(price * quantity) : (price * quantity).toFixed(2)} CHF
                            </div>
                            
                            {/* Bouton supprimer */}
                            <button
                              onClick={() => {
                                if (isServerItem) {
                                  removeServerItem(productId)
                                } else {
                                  handleLocalRemoveItem(productId, productName)
                                }
                              }}
                              disabled={isUpdating}
                              className="text-gray-400 hover:text-red-600 transition-colors p-2"
                              aria-label="Supprimer l'article"
                            >
                              {updatingItemId === productId && isUpdating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Trash2 className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Réservations (uniquement pour les utilisateurs connectés) */}
              {isConnected && bookings.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-black">Réservations de Livraison</h2>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {bookings.map((booking) => {
                      const deliveryDate = new Date(booking.deliverySlot.date)
                      const { isExpiring, timeRemaining } = getExpiryInfo(booking)
                      const bookingPrice = booking.price || booking.deliverySlot.product.price || 0
                      const bookingTotal = bookingPrice * booking.quantity
                      
                      return (
                        <div key={booking.id} className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Image du produit */}
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-4">
                              {booking.deliverySlot.product.image ? (
                                <Image
                                  src={booking.deliverySlot.product.image}
                                  alt={booking.deliverySlot.product.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-600 bg-blue-50">
                                  <Calendar className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                            
                            {/* Informations de réservation */}
                            <div className="flex-1">
                              <div className="font-medium text-black">
                                {booking.deliverySlot.product.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Livraison le {formatDateToFrench(deliveryDate)}
                              </div>
                              <div className="text-sm text-black">
                                Quantité: {formatNumber ? formatNumber(booking.quantity) : booking.quantity} {booking.deliverySlot.product.unit}
                                <span className="ml-1 font-medium">
                                  ({formatNumber ? formatNumber(bookingTotal) : bookingTotal.toFixed(2)} CHF)
                                </span>
                              </div>
                              
                              {/* Notification d'expiration */}
                              {isExpiring && timeRemaining !== null && (
                                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                  Cette réservation expirera dans {timeRemaining} minute{timeRemaining > 1 ? 's' : ''} si vous ne finalisez pas votre commande.
                                </div>
                              )}
                            </div>
                            
                            {/* Bouton annuler */}
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              disabled={isUpdating}
                              className="text-gray-400 hover:text-red-600 transition-colors p-2"
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
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Résumé de la commande */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
                <h2 className="text-lg font-semibold mb-4 text-black">Résumé de la commande</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="text-black">{formatNumber ? formatNumber(grandTotal) : grandTotal.toFixed(2)} CHF</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Livraison</span>
                    <span className="text-green-600">Calculée à l'étape suivante</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-black">Total</span>
                    <span className="text-black">{formatNumber ? formatNumber(grandTotal) : grandTotal.toFixed(2)} CHF</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">TVA incluse</p>
                </div>

                {/* Message pour utilisateurs non connectés */}
                {!session && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Information :</strong> Vous devrez vous connecter pour finaliser votre commande.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isCartEmpty || isUpdating}
                  className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {session ? 'Procéder au paiement' : 'Se connecter et commander'}
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="mt-4">
                  <Link 
                    href="/"
                    className="text-sm text-center w-full block text-black hover:text-gray-600 transition-colors"
                  >
                    Continuer mes achats
                  </Link>
                </div>

                {/* Info sécurité */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Paiement sécurisé • Livraison rapide
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}