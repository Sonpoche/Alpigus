// types/order.ts
import { OrderStatus as PrismaOrderStatus } from '@prisma/client'
import { Invoice } from './invoice';

// Extension de l'enum OrderStatus pour inclure nos valeurs personnalisées
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  // Nouveaux statuts liés aux factures
  INVOICE_PENDING = 'INVOICE_PENDING',
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE'
}

export enum BookingStatus {
  TEMPORARY = 'TEMPORARY',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

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
  slotId: string
  orderId: string
  quantity: number
  price?: number | null
  status: string
  expiresAt?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
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
  status: OrderStatus | PrismaOrderStatus | string
  total: number
  items: OrderItem[]
  bookings: Booking[]
  metadata?: string | null
  invoice?: Invoice | null  // Ajout de la relation avec la facture
}

export interface DeliveryInfo {
  type: string
  fullName?: string
  company?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  notes?: string
  paymentMethod?: string
  paymentStatus?: string
  dueDate?: string | Date
}