// app/(protected)/producteur/commandes/page.tsx
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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        
        const url = new URL('/api/orders/producer', window.location.origin)
        if (activeStatus) {
          url.searchParams.set('status', activeStatus)
        }

        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des commandes')
        }
        
        const data = await response.json()
        
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

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true)
      
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
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      
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

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    if (order.id.toLowerCase().includes(searchLower)) return true
    if (order.user?.name?.toLowerCase().includes(searchLower)) return true
    if (order.user?.email?.toLowerCase().includes(searchLower)) return true
    
    const hasMatchingProduct = order.items?.some(item => 
      item.product.name.toLowerCase().includes(searchLower)
    )
    
    if (hasMatchingProduct) return true
    
    const statusLabel = getStatusLabel(order.status as OrderStatus)
    if (statusLabel.includes(searchLower)) return true
    
    return false
  })

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-custom-title mb-2">
              Mes Commandes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos commandes et suivez leur statut
            </p>
          </div>
        </div>

        <OrderStats orders={orders} />

        <OrderFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />

        {filteredOrders.length === 0 ? (
          <EmptyOrdersView
            searchTerm={searchTerm}
            activeStatus={activeStatus}
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <OrderItem
                    order={order}
                    onViewDetails={handleViewDetails}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={isUpdating}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedOrder(null)
          }}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}