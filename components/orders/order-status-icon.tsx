// components/orders/order-status-icon.tsx
import { 
    Clock, 
    CheckCircle, 
    Truck, 
    Package, 
    XCircle, 
    AlertCircle 
  } from 'lucide-react'
  import { OrderStatus } from '@prisma/client'
  
  interface OrderStatusIconProps {
    status: OrderStatus
    className?: string
  }
  
  export default function OrderStatusIcon({ status, className = "h-5 w-5" }: OrderStatusIconProps) {
    switch (status) {
      case 'PENDING':
        return <Clock className={`text-amber-500 ${className}`} />
      case 'CONFIRMED':
        return <CheckCircle className={`text-blue-500 ${className}`} />
      case 'SHIPPED':
        return <Truck className={`text-purple-500 ${className}`} />
      case 'DELIVERED':
        return <Package className={`text-green-500 ${className}`} />
      case 'CANCELLED':
        return <XCircle className={`text-red-500 ${className}`} />
      default:
        return <AlertCircle className={`text-gray-500 ${className}`} />
    }
  }