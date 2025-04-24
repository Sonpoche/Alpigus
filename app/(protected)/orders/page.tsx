// app/(protected)/orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package,
  Calendar,
  ChevronRight,
  Search,
  FilterIcon,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { OrderStatus } from '@prisma/client'

interface OrderItem {
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

interface Order {
  id: string
  createdAt: string
  updatedAt: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  bookings: Booking[]
  metadata?: string
  user?: {
    name: string | null
    email: string
    phone: string
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Charger les commandes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        
        // Construction de l'URL avec les filtres
        const url = new URL('/api/orders', window.location.origin)
        if (activeStatus) {
          url.searchParams.set('status', activeStatus)
        }

        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des commandes')
        }
        
        const data = await response.json()
        
        // Trier les commandes par date (plus récentes en premier)
        const sortedOrders = data.sort((a: Order, b: Order) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        
        setOrders(sortedOrders)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: 'Erreur',
          description: 'Impossible de charger vos commandes',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchOrders()
  }, [activeStatus, toast])

  // Vérifier les paramètres d'URL pour ouvrir automatiquement une modal
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      // Vérifier si nous avons un paramètre modal dans l'URL
      const params = new URLSearchParams(window.location.search);
      const modalOrderId = params.get('modal');
      
      if (modalOrderId) {
        // Trouver l'ordre correspondant
        const orderToShow = orders.find(order => order.id === modalOrderId);
        if (orderToShow) {
          // Ouvrir la modal avec cette commande
          setSelectedOrder(orderToShow);
          setIsDetailOpen(true);
        }
      }
    }
  }, [orders, isLoading]);

  // Gestion du statut de commande avec le bon badge
  const getStatusBadge = (status: OrderStatus) => {
    const statusLabels: Record<OrderStatus, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
      INVOICE_PENDING: 'Facture en attente',
      INVOICE_PAID: 'Facture payée'
    }

    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">{statusLabels.PENDING}</Badge>
      case 'CONFIRMED':
        return <Badge variant="success" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">{statusLabels.CONFIRMED}</Badge>
      case 'SHIPPED':
        return <Badge variant="info" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">{statusLabels.SHIPPED}</Badge>
      case 'DELIVERED':
        return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">{statusLabels.DELIVERED}</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">{statusLabels.CANCELLED}</Badge>
      case 'INVOICE_PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">{statusLabels.INVOICE_PENDING}</Badge>
      case 'INVOICE_PAID':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">{statusLabels.INVOICE_PAID}</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  // Gestion de l'icône de statut
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-amber-500" />
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'SHIPPED':
        return <Truck className="h-5 w-5 text-purple-500" />
      case 'DELIVERED':
        return <Package className="h-5 w-5 text-green-500" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'INVOICE_PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'INVOICE_PAID':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  // Filtrer les commandes par recherche
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Recherche par ID de commande
    if (order.id.toLowerCase().includes(searchLower)) return true
    
    // Recherche par nom de produit
    const hasMatchingProduct = order.items.some(item => 
      item.product.name.toLowerCase().includes(searchLower)
    )
    
    if (hasMatchingProduct) return true
    
    // Recherche par statut
    const statusLabels: Record<OrderStatus, string> = {
      PENDING: 'en attente',
      CONFIRMED: 'confirmée',
      SHIPPED: 'expédiée',
      DELIVERED: 'livrée',
      CANCELLED: 'annulée',
      INVOICE_PENDING: 'facture en attente',
      INVOICE_PAID: 'facture payée'
    }
    
    const statusLabel = statusLabels[order.status]
    if (statusLabel && statusLabel.includes(searchLower)) return true
    
    return false
  })

  // Extraire les informations de livraison des métadonnées
  const getDeliveryInfo = (order: Order) => {
    if (!order.metadata) return null;
    
    try {
      const metadata = JSON.parse(order.metadata);
      return {
        type: metadata.deliveryType,
        address: metadata.deliveryAddress,
        notes: metadata.deliveryNotes,
        paymentMethod: metadata.paymentMethod
      };
    } catch {
      return null;
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes commandes</h1>
        <p className="text-muted-foreground">
          Consultez l'historique et le statut de vos commandes
        </p>
      </div>
      
      {/* Filtres et recherche */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une commande..."
            className="pl-10 w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveStatus(null)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === null
                ? 'bg-custom-accent text-white'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <FilterIcon className="h-4 w-4 mr-1 inline-block" />
            Toutes
          </button>
          
          <button
            onClick={() => setActiveStatus('PENDING')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === 'PENDING'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <Clock className="h-4 w-4 mr-1 inline-block" />
            En attente
          </button>
          
          <button
            onClick={() => setActiveStatus('CONFIRMED')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === 'CONFIRMED'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-1 inline-block" />
            Confirmées
          </button>
          
          <button
            onClick={() => setActiveStatus('SHIPPED')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === 'SHIPPED'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <Truck className="h-4 w-4 mr-1 inline-block" />
            Expédiées
          </button>
          
          <button
            onClick={() => setActiveStatus('DELIVERED')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === 'DELIVERED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <Package className="h-4 w-4 mr-1 inline-block" />
            Livrées
          </button>
        </div>
      </div>
      
      {/* Liste des commandes */}
      {orders.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-12 text-center">
          <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground mb-6 opacity-20" />
          <h2 className="text-2xl font-medium mb-4">Vous n'avez pas encore de commande</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Commencez vos achats en explorant notre catalogue de champignons frais, séchés et produits de bien-être.
          </p>
          <Link 
            href="/products" 
            className="bg-custom-accent text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Explorer le catalogue
          </Link>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* En-tête de la commande */}
              <div className="px-6 py-4 border-b border-foreground/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-custom-accent" />
                  <h3 className="font-medium">
                    Commande #{order.id.substring(0, 8).toUpperCase()}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
              </div>
              
              {/* Aperçu des produits */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <div className="space-y-4">
                    {/* Affichage des produits standard */}
                    {order.items.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Produits :</p>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                                {item.product.image ? (
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-foreground/30">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} {item.product.unit} ({(item.price * item.quantity).toFixed(2)} CHF)
                                </p>
                              </div>
                            </div>
                          ))}
                          
                          {order.items.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              +{order.items.length - 3} autres produits
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Affichage des réservations/livraisons */}
                    {order.bookings && order.bookings.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Livraisons programmées :</p>
                        <div className="space-y-2">
                          {order.bookings.slice(0, 2).map((booking) => (
                            <div key={booking.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                                {booking.deliverySlot.product.image ? (
                                  <img
                                    src={booking.deliverySlot.product.image}
                                    alt={booking.deliverySlot.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{booking.deliverySlot.product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(booking.deliverySlot.date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                  {new Date(booking.deliverySlot.date) < new Date() && (
                                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                      Passé
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quantité: {booking.quantity} {booking.deliverySlot.product.unit}
                                </p>
                              </div>
                            </div>
                          ))}
                          
                          {order.bookings.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              +{order.bookings.length - 2} autres livraisons
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Informations de résumé */}
                <div className="sm:col-span-1 flex sm:flex-col justify-between sm:justify-start items-end sm:border-l sm:border-foreground/10 sm:pl-6">
                  <div className="text-right sm:mb-4">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-semibold text-lg">{order.total.toFixed(2)} CHF</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedOrder(order)
                      setIsDetailOpen(true)
                    }}
                    className="text-custom-accent hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
                  >
                    Détails <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Aucune commande trouvée</h2>
          <p className="text-muted-foreground mb-6">
            {searchTerm || activeStatus
              ? "Aucune commande ne correspond à vos critères de recherche."
              : "Vous n'avez pas encore passé de commande."}
          </p>
          <Link 
            href="/products" 
            className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Découvrir nos produits
          </Link>
        </div>
      )}
      
      {/* Modal de détails de commande */}
      {selectedOrder && (
        <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isDetailOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-foreground/10 flex justify-between items-center sticky top-0 bg-background z-10">
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedOrder.status)}
                  <h3 className="font-medium text-lg">
                    Commande #{selectedOrder.id.substring(0, 8).toUpperCase()}
                  </h3>
                </div>
                
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de commande</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <div>{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  
                  {/* Informations de livraison */}
                  {selectedOrder.metadata && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Mode de livraison</p>
                        <p className="font-medium">
                          {getDeliveryInfo(selectedOrder)?.type === 'pickup' 
                            ? 'Retrait sur place' 
                            : 'Livraison à domicile'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paiement</p>
                        <p className="font-medium">
                          {getDeliveryInfo(selectedOrder)?.paymentMethod === 'invoice' 
                            ? 'Facturation' 
                            : 'Carte de crédit'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Adresse de livraison si applicable */}
                {getDeliveryInfo(selectedOrder)?.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Adresse de livraison</p>
                    <p className="p-3 bg-foreground/5 rounded-md">
                      {getDeliveryInfo(selectedOrder)?.address}
                    </p>
                  </div>
                )}
                
                {/* Notes de livraison si applicable */}
                {getDeliveryInfo(selectedOrder)?.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Instructions spéciales</p>
                    <p className="p-3 bg-foreground/5 rounded-md">
                      {getDeliveryInfo(selectedOrder)?.notes}
                    </p>
                  </div>
                )}
                
                {/* Produits */}
                <div>
                  <p className="font-medium mb-3">Produits commandés</p>
                  <div className="space-y-4 divide-y divide-foreground/10">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex pt-4 first:pt-0">
                        <div className="w-16 h-16 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground/30">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <Link href={`/products/${item.product.id}`} className="font-medium hover:text-custom-accent">
                            {item.product.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Quantité: {item.quantity} {item.product.unit}
                          </p>
                          <p className="text-sm">
                            Prix unitaire: {item.price.toFixed(2)} CHF
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="font-medium">{(item.price * item.quantity).toFixed(2)} CHF</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Livraisons programmées */}
                {selectedOrder.bookings && selectedOrder.bookings.length > 0 && (
                  <div>
                    <p className="font-medium mb-3">Livraisons programmées</p>
                    <div className="space-y-4 divide-y divide-foreground/10">
                      {selectedOrder.bookings.map((booking) => {
                        const isPast = new Date(booking.deliverySlot.date) < new Date();
                        return (
                          <div key={booking.id} className="flex pt-4 first:pt-0">
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              {booking.deliverySlot.product.image ? (
                                <img
                                  src={booking.deliverySlot.product.image}
                                  alt={booking.deliverySlot.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center">
                                <p className="font-medium">{booking.deliverySlot.product.name}</p>
                                {isPast && (
                                  <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                    Passé
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                              {isPast ? "Livraison était prévue le " : "Livraison prévue le "} 
                                {new Date(booking.deliverySlot.date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-sm mt-1">
                                Quantité: {booking.quantity} {booking.deliverySlot.product.unit}
                              </p>
                              <p className="text-sm font-medium mt-1">
                                {(booking.price ? booking.price * booking.quantity : 
                                  booking.deliverySlot.product.price ? booking.deliverySlot.product.price * booking.quantity : 
                                  0).toFixed(2)} CHF
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Résumé des coûts */}
                <div className="border-t border-foreground/10 pt-4">
                  <div className="flex justify-between mb-2">
                    <p>Sous-total</p>
                    <p>{selectedOrder.total.toFixed(2)} CHF</p>
                  </div>
                  {getDeliveryInfo(selectedOrder)?.type === 'delivery' && (
                    <div className="flex justify-between mb-2">
                      <p>Frais de livraison</p>
                      <p>15.00 CHF</p>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-foreground/10">
                    <p>Total</p>
                    <p>{((getDeliveryInfo(selectedOrder)?.type === 'delivery' ? 15 : 0) + selectedOrder.total).toFixed(2)} CHF</p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                  >
                    Fermer
                  </button>
                  
                  {selectedOrder.status === 'DELIVERED' && (
                    <button
                      className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                    >
                      Télécharger la facture
                    </button>
                  )}
                  
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={async () => {
                        if (window.confirm("Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.")) {
                          try {
                            const response = await fetch(`/api/orders/${selectedOrder.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'CANCELLED' })
                            });
                            
                            if (!response.ok) {
                              throw new Error('Erreur lors de l\'annulation de la commande');
                            }
                            
                            toast({
                              title: "Commande annulée",
                              description: "Votre commande a été annulée avec succès"
                            });
                            
                            setIsDetailOpen(false);
                            
                            // Rafraîchir la liste des commandes
                            setTimeout(() => {
                              window.location.reload();
                            }, 500);
                          } catch (error) {
                            console.error('Erreur:', error);
                            toast({
                              title: "Erreur",
                              description: "Impossible d'annuler la commande",
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Annuler la commande
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}