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
  const pendingOrders = validOrders.filter(order => order.status === OrderStatus.PENDING);
  const confirmedOrders = validOrders.filter(order => order.status === OrderStatus.CONFIRMED);
  const shippedOrders = validOrders.filter(order => order.status === OrderStatus.SHIPPED);
  const deliveredOrders = validOrders.filter(order => order.status === OrderStatus.DELIVERED);
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="bg-background border border-foreground/10 rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Commandes totales</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{validOrders.length}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground/5 flex items-center justify-center mt-2 sm:mt-0 self-end sm:self-auto">
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/60" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">À traiter</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{pendingOrders.length}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mt-2 sm:mt-0 self-end sm:self-auto">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-3 sm:p-4 shadow-sm col-span-2 sm:col-span-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Confirmées</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{confirmedOrders.length}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mt-2 sm:mt-0 self-end sm:self-auto">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Expédiées</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{shippedOrders.length}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mt-2 sm:mt-0 self-end sm:self-auto">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Livrées</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{deliveredOrders.length}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mt-2 sm:mt-0 self-end sm:self-auto">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}