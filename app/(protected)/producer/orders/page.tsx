// app/(protected)/producer/orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  ShoppingBag, 
  Search, 
  FilterIcon, 
  Plus,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  Package,
  Calendar,
  User,
  Phone,
  Mail
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrderStatus } from '@prisma/client'
import OrderFilterBar from '@/components/orders/order-filter-bar'
import OrderStats from '@/components/orders/order-stats'
import OrderItem from '@/components/orders/order-item'
import OrderDetailModal from '@/components/orders/order-detail-modal'
import EmptyOrdersView from '@/components/orders/empty-orders-view'
import { formatDateToFrench } from '@/lib/date-utils'
import { Order } from '@/types/order'

export default function ProducerOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Charger les commandes du producteur
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        
        // Construction de l'URL avec les filtres
        const url = new URL('/api/orders/producer', window.location.origin)
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
          description: 'Impossible de charger les commandes',
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
      const params = new URLSearchParams(window.location.search);
      const modalOrderId = params.get('modal');
      
      if (modalOrderId) {
        const orderToShow = orders.find(order => order.id === modalOrderId);
        if (orderToShow) {
          setSelectedOrder(orderToShow);
          setIsDetailOpen(true);
        }
      }
    }
  }, [orders, isLoading]);

  // Mettre à jour le statut d'une commande avec événements
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true)
      
      // Garder l'ancien statut pour l'événement
      const currentOrder = orders.find(order => order.id === orderId)
      const oldStatus = currentOrder?.status
      
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erreur lors de la mise à jour du statut')
      }
      
      // Mettre à jour l'état local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      
      // Déclencher les événements de notification
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('order:status-changed', {
          detail: { 
            orderId,
            oldStatus,
            newStatus,
            timestamp: Date.now()
          }
        }))
        
        window.dispatchEvent(new CustomEvent('order:updated', {
          detail: { 
            orderId,
            action: 'status-changed',
            timestamp: Date.now()
          }
        }))
      }, 500)
      
      toast({
        title: 'Statut mis à jour',
        description: `La commande est maintenant ${getStatusLabel(newStatus)}`
      })
      
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Obtenir le libellé du statut en français
  const getStatusLabel = (status: OrderStatus): string => {
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
    return statusLabels[status] || status
  }

  // Filtrer les commandes
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Recherche par ID de commande
    if (order.id.toLowerCase().includes(searchLower)) return true
    
    // Recherche par nom du client
    if (order.user?.name?.toLowerCase().includes(searchLower)) return true
    
    // Recherche par email du client
    if (order.user?.email?.toLowerCase().includes(searchLower)) return true
    
    // Recherche par nom de produit
    const hasMatchingProduct = order.items?.some(item => 
      item.product.name.toLowerCase().includes(searchLower)
    )
    
    if (hasMatchingProduct) return true
    
    // Recherche par statut
    const statusLabel = getStatusLabel(order.status as OrderStatus)
    if (statusLabel.includes(searchLower)) return true
    
    return false
  })

  // Gérer l'ouverture des détails de commande
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
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
          Gérez vos commandes et leur statut
        </p>
      </div>

      {/* Statistiques */}
      <OrderStats orders={orders} />

      {/* Barre de filtres */}
      <OrderFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
      />

      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <EmptyOrdersView searchTerm={searchTerm} activeStatus={activeStatus} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order) => (
              <OrderItem
                key={order.id}
                order={order}
                onViewDetails={handleViewDetails}
                onUpdateStatus={handleUpdateStatus}
                isUpdating={isUpdating}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de détail de commande */}
      <AnimatePresence>
        {selectedOrder && isDetailOpen && (
          <OrderDetailModal
            order={selectedOrder}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={isUpdating}
          />
        )}
      </AnimatePresence>
    </div>
  )
}