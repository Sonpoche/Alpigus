// components/orders/payment-status-badge.tsx
'use client'

import { cn } from "@/lib/utils"
import { Clock, CreditCard, AlertCircle, CheckCircle, DollarSign } from "lucide-react"

interface PaymentStatusBadgeProps {
  status: string
  dueDate?: string | Date | null
  className?: string
}

export default function PaymentStatusBadge({ 
  status, 
  dueDate, 
  className 
}: PaymentStatusBadgeProps) {
  // Calculer les jours restants si c'est un paiement à terme avec date d'échéance
  const getRemainingDays = () => {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  const remainingDays = dueDate ? getRemainingDays() : null;
  
  switch (status) {
    case 'PAID':
    case 'INVOICE_PAID':
      return (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium dark:bg-green-900/20 dark:text-green-300",
          className
        )}>
          <CheckCircle className="h-3 w-3" />
          <span>Payé</span>
        </div>
      );
    case 'PENDING':
    case 'INVOICE_PENDING':
      if (remainingDays !== null) {
        // Paiement à 30 jours avec date d'échéance
        return (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            remainingDays <= 5 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300" : 
            remainingDays <= 10 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300" :
            "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
            className
          )}>
            <Clock className="h-3 w-3" />
            <span>
              {remainingDays <= 0 
                ? "Échéance dépassée" 
                : `${remainingDays} jour${remainingDays > 1 ? 's' : ''} restant${remainingDays > 1 ? 's' : ''}`}
            </span>
          </div>
        );
      }
      
      // Statut en attente sans date d'échéance
      return (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium dark:bg-gray-800 dark:text-gray-300",
          className
        )}>
          <DollarSign className="h-3 w-3" />
          <span>Paiement en attente</span>
        </div>
      );
    case 'OVERDUE':
    case 'INVOICE_OVERDUE':
      return (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium dark:bg-red-900/20 dark:text-red-300",
          className
        )}>
          <AlertCircle className="h-3 w-3" />
          <span>Paiement en retard</span>
        </div>
      );
    default:
      return null;
  }
}