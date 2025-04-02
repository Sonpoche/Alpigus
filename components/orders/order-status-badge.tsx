// components/orders/order-status-badge.tsx
import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@prisma/client'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge 
          variant="warning" 
          className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
        >
          En attente
        </Badge>
      )
    case 'CONFIRMED':
      return (
        <Badge 
          variant="success" 
          className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
        >
          Confirmée
        </Badge>
      )
    case 'SHIPPED':
      return (
        <Badge 
          variant="info" 
          className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
        >
          Expédiée
        </Badge>
      )
    case 'DELIVERED':
      return (
        <Badge 
          variant="success" 
          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
        >
          Livrée
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge 
          variant="destructive" 
          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
        >
          Annulée
        </Badge>
      )
    default:
      return <Badge variant="outline">Inconnu</Badge>
  }
}