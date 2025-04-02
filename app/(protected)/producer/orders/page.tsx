// app/(protected)/producer/orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { OrderStatus } from '@prisma/client'
import { Order } from '@/types/order'

// Importation des composants refactorisés
import OrderStats from '@/components/orders/order-stats'
import OrderFilterBar from '@/components/orders/order-filter-bar'
import OrderItem from '@/components/orders/order-item'
import OrderDetailModal from '@/components/orders/order-detail-modal'
import EmptyOrdersView from '@/components/orders/empty-orders-view'

export default function ProducerOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Charger les commandes pour le producteur
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
        setFilteredOrders(sortedOrders)
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

  // Filtrer les commandes par recherche et status
  useEffect(() => {
    if (!orders.length) return

    let filtered = [...orders]
    
    // Appliquer le filtre de statut si présent
    if (activeStatus) {
      filtered = filtered.filter(order => order.status === activeStatus)
    }
    
    // Appliquer la recherche si présente
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order => {
        // Recherche par ID de commande
        if (order.id.toLowerCase().includes(searchLower)) return true
        
        // Recherche par nom du client
        if (order.user?.name?.toLowerCase().includes(searchLower)) return true
        
        // Recherche par email du client
        if (order.user?.email.toLowerCase().includes(searchLower)) return true
        
        // Recherche par nom de produit
        const hasMatchingProduct = [...order.items, ...order.bookings.map(b => ({ 
          product: b.deliverySlot.product 
        }))].some(item => 
          item.product.name.toLowerCase().includes(searchLower)
        )
        
        if (hasMatchingProduct) return true
        
        // Recherche par statut
        const statusLabels: Record<OrderStatus, string> = {
          PENDING: 'en attente',
          CONFIRMED: 'confirmée',
          SHIPPED: 'expédiée',
          DELIVERED: 'livrée',
          CANCELLED: 'annulée'
        }
        
        const statusLabel = statusLabels[order.status as OrderStatus]
        if (statusLabel && statusLabel.includes(searchLower)) return true
        
        return false
      })
    }
    
    setFilteredOrders(filtered)
  }, [orders, searchTerm, activeStatus])

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du statut: ${response.statusText}`);
      }
      
      // Mettre à jour l'état local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Mettre à jour l'ordre sélectionné si ouvert
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      toast({
        title: "Statut mis à jour",
        description: `La commande a été ${newStatus === 'SHIPPED' ? 'marquée comme expédiée' : 
                      newStatus === 'DELIVERED' ? 'marquée comme livrée' : 
                      newStatus === 'CONFIRMED' ? 'confirmée' : 'mise à jour'}`
      });
      
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

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
        <h1 className="text-3xl font-bold mb-2">Commandes</h1>
        <p className="text-muted-foreground">
          Gérez les commandes pour vos produits et préparez vos livraisons
        </p>
      </div>
      
      {/* Filtres et recherche */}
      <OrderFilterBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
      />
      
      {/* Statistiques des commandes */}
      <OrderStats orders={filteredOrders} />
      
      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <EmptyOrdersView searchTerm={searchTerm} activeStatus={activeStatus} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => (
            <OrderItem 
              key={order.id}
              order={order}
              onViewDetails={(order) => {
                setSelectedOrder(order)
                setIsDetailOpen(true)
              }}
              onUpdateStatus={updateOrderStatus}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
      
      {/* Modal de détails de commande */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onUpdateStatus={updateOrderStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}