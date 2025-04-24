// types/invoice.ts
import { Order } from './order';
import { User } from 'next-auth';

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export interface Invoice {
  id: string
  orderId: string
  userId: string
  amount: number
  status: InvoiceStatus | string
  dueDate: string | Date
  paidAt?: string | Date | null
  paymentMethod?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  order?: Order
  user?: User
}