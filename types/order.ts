// types/order.ts
import { OrderStatus } from '@prisma/client'

export interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    image: string | null
    producerId: string
  }
}

export interface Booking {
  id: string
  quantity: number
  price?: number | null
  status: string
  deliverySlot: {
    id: string
    date: string | Date
    product: {
      id: string
      name: string
      price: number
      unit: string
      image: string | null
      producerId: string
    }
  }
}

export interface Order {
  id: string
  userId: string
  user: {
    name: string | null
    email: string
    phone: string
  }
  createdAt: string | Date
  updatedAt: string | Date
  status: OrderStatus
  total: number
  items: OrderItem[]
  bookings: Booking[]
  metadata?: string | null  // Modifié ici pour accepter null
}

export interface DeliveryInfo {
  type: string
  address: string
  notes: string
  paymentMethod: string
}