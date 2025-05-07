// components/orders/order-stats.tsx
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  Truck, 
  Package 
} from 'lucide-react'
import { Order } from '@/types/order'
import { OrderStatus } from '@prisma/client'

interface OrderStatsProps {
  orders: Order[]
}

export default function OrderStats({ orders }: OrderStatsProps) {
  // Filtrer les commandes DRAFT (paniers) de toutes les statistiques
  const validOrders = orders.filter(order => order.status !== OrderStatus.DRAFT);
  
  // Calculate stats - en excluant explicitement les DRAFT
  const pendingOrders = validOrders.filter(order => order.status === OrderStatus.CONFIRMED);
  const confirmedOrders = validOrders.filter(order => order.status === OrderStatus.CONFIRMED);
  const shippedOrders = validOrders.filter(order => order.status === OrderStatus.SHIPPED);
  const deliveredOrders = validOrders.filter(order => order.status === OrderStatus.DELIVERED);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Commandes totales</p>
            <p className="text-2xl font-bold mt-1">{validOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-foreground/60" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">À traiter</p>
            <p className="text-2xl font-bold mt-1">{pendingOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Confirmées</p>
            <p className="text-2xl font-bold mt-1">{confirmedOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Expédiées</p>
            <p className="text-2xl font-bold mt-1">{shippedOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Livrées</p>
            <p className="text-2xl font-bold mt-1">{deliveredOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}