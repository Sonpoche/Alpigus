// types/notification.ts
import { UserRole } from '@prisma/client'

export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  LOW_STOCK = 'LOW_STOCK',
  DELIVERY_REMINDER = 'DELIVERY_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SYSTEM = 'SYSTEM'
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  data?: any
  createdAt: string
}