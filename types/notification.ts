// types/notification.ts
export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  LOW_STOCK = 'LOW_STOCK',
  DELIVERY_REMINDER = 'DELIVERY_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SYSTEM = 'SYSTEM',
  // Types relatifs aux factures
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_REMINDER = 'INVOICE_REMINDER',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  INVOICE_PAID = 'INVOICE_PAID'
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType | string
  title: string
  message: string
  link?: string
  read: boolean
  data?: any
  createdAt: string | Date
  updatedAt?: string | Date
}