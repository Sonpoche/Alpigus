// app/(protected)/orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  AlertCircle,
  Edit2,
  MapPin,
  Store,
  Phone
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { OrderStatus } from '@prisma/client'
import { Order } from '@/types/order'

// Import des composants modal
import OrderDetailModal from '@/components/orders/order-detail-modal'
import ClientOrderDetailModal from '@/components/orders/client-order-detail-modal'

// Composant pour afficher l'adresse de retrait
function OrderPickupAddress({ orderId, deliveryType }: { orderId: string, deliveryType: string }) {
  const [producerDetails, setProducerDetails] = useState<{
    companyName: string
    address: string
    phone: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (deliveryType !== 'pickup') {
      setIsLoading(false)
      return
    }

    async function fetchProducerAddress() {
      try {
        setIsLoading(true)
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
        Veuillez vous présenter avec votre numéro de commande #{orderId.substring(0, 8).toUpperCase()} lors du retrait.
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<OrderStatus | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Charger les commandes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        
        // Construction de l'URL avec les filtres
        const url = new URL('/api/orders', window.location.origin)
        if (activeStatus) {
          url.searchParams.set('status', activeStatus as string)
        }

        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des commandes')
        }
        
        const data = await response.json()
        
        // Filtrer explicitement les commandes pour exclure les DRAFT
        const filteredOrders = data.filter((order: Order) => order.status !== OrderStatus.DRAFT)
        
        // Trier les commandes par date (plus récentes en premier)
        const sortedOrders = filteredOrders.sort((a: Order, b: Order) => {
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

  // Fonction pour gérer la mise à jour du statut (pour les producteurs/admins)
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true)
      
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }
      
      // Rafraîchir la liste des commandes
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      )
      setOrders(updatedOrders)
      
      // Mettre à jour l'ordre sélectionné si nécessaire
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
      
      toast({
        title: 'Statut mis à jour',
        description: `La commande est maintenant ${newStatus.toLowerCase()}`,
      })
      
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut de la commande',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Gestion du statut de commande avec le bon badge
  const getStatusBadge = (status: OrderStatus | string) => {
    const orderStatus = status as OrderStatus
    const statusLabels: Record<OrderStatus, string> = {
      [OrderStatus.DRAFT]: 'Brouillon',
      [OrderStatus.PENDING]: 'En attente',
      [OrderStatus.CONFIRMED]: 'Confirmée',
      [OrderStatus.SHIPPED]: 'Expédiée',
      [OrderStatus.DELIVERED]: 'Livrée',
      [OrderStatus.CANCELLED]: 'Annulée',
      [OrderStatus.INVOICE_PENDING]: 'Facture en attente',
      [OrderStatus.INVOICE_PAID]: 'Facture payée',
      [OrderStatus.INVOICE_OVERDUE]: 'Facture en retard'
    }

    switch (orderStatus) {
      case OrderStatus.DRAFT:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800">{statusLabels[OrderStatus.DRAFT]}</Badge>
      case OrderStatus.PENDING:
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">{statusLabels[OrderStatus.PENDING]}</Badge>
      case OrderStatus.CONFIRMED:
        return <Badge variant="success" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">{statusLabels[OrderStatus.CONFIRMED]}</Badge>
      case OrderStatus.SHIPPED:
        return <Badge variant="info" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">{statusLabels[OrderStatus.SHIPPED]}</Badge>
      case OrderStatus.DELIVERED:
        return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">{statusLabels[OrderStatus.DELIVERED]}</Badge>
      case OrderStatus.CANCELLED:
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">{statusLabels[OrderStatus.CANCELLED]}</Badge>
      case OrderStatus.INVOICE_PENDING:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">{statusLabels[OrderStatus.INVOICE_PENDING]}</Badge>
      case OrderStatus.INVOICE_PAID:
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">{statusLabels[OrderStatus.INVOICE_PAID]}</Badge>
      case OrderStatus.INVOICE_OVERDUE:
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">{statusLabels[OrderStatus.INVOICE_OVERDUE]}</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  // Filtrer les commandes par recherche
  const filteredOrders = orders.filter(order => {
    // D'abord, s'assurer qu'on n'inclut JAMAIS les commandes DRAFT (paniers)
    if ((order.status as OrderStatus) === OrderStatus.DRAFT) return false;
    
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
      [OrderStatus.DRAFT]: 'brouillon',
      [OrderStatus.PENDING]: 'en attente',
      [OrderStatus.CONFIRMED]: 'confirmée',
      [OrderStatus.SHIPPED]: 'expédiée',
      [OrderStatus.DELIVERED]: 'livrée',
      [OrderStatus.CANCELLED]: 'annulée',
      [OrderStatus.INVOICE_PENDING]: 'facture en attente',
      [OrderStatus.INVOICE_PAID]: 'facture payée',
      [OrderStatus.INVOICE_OVERDUE]: 'facture en retard'
    }
    
    const statusLabel = statusLabels[order.status as OrderStatus]
    if (statusLabel && statusLabel.includes(searchLower)) return true
    
    return false
  })

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
            onClick={() => setActiveStatus(OrderStatus.PENDING)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === OrderStatus.PENDING
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <Clock className="h-4 w-4 mr-1 inline-block" />
            En attente
          </button>
          
          <button
            onClick={() => setActiveStatus(OrderStatus.CONFIRMED)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === OrderStatus.CONFIRMED
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-1 inline-block" />
            Confirmées
          </button>
          
          <button
            onClick={() => setActiveStatus(OrderStatus.SHIPPED)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === OrderStatus.SHIPPED
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
            }`}
          >
            <Truck className="h-4 w-4 mr-1 inline-block" />
            Expédiées
          </button>
          
          <button
            onClick={() => setActiveStatus(OrderStatus.DELIVERED)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
              activeStatus === OrderStatus.DELIVERED
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
      {filteredOrders.length === 0 ? (
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
      ) : (
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
      )}
     
      {/* Modal de détail de commande - Utilisation des composants */}
      <AnimatePresence>
        {selectedOrder && isDetailOpen && (
          session?.user?.role === 'CLIENT' ? (
            // Modal pour clients
            <ClientOrderDetailModal
              order={selectedOrder}
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
            />
          ) : (
            // Modal pour producteurs/admins
            <OrderDetailModal
              order={selectedOrder}
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={isUpdating}
            />
          )
        )}
      </AnimatePresence>
    </div>
  )
}