// components/orders/order-item.tsx
import { motion } from 'framer-motion'
import { Order, OrderItem, Booking } from '@/types/order'
import { formatDateToFrench } from '@/lib/date-utils'
import { OrderStatus } from '@prisma/client'
import Link from 'next/link'
import { 
  User, 
  ChevronRight, 
  Package, 
  Calendar,
  CheckCircle,
  Truck
} from 'lucide-react'
import OrderStatusBadge from './order-status-badge'
import OrderStatusIcon from './order-status-icon'
import PaymentStatusBadge from './payment-status-badge'

interface OrderItemProps {
  order: Order
  onViewDetails: (order: Order) => void
  onUpdateStatus: (orderId: string, newStatus: any) => void
  isUpdating: boolean
}

export default function OrderItemComponent({ 
  order, 
  onViewDetails, 
  onUpdateStatus,
  isUpdating
}: OrderItemProps) {
  // Extraire les informations de paiement depuis metadata
  const getPaymentInfo = () => {
    if (order.metadata) {
      try {
        const metadata = JSON.parse(order.metadata);
        return {
          paymentMethod: metadata.paymentMethod,
          paymentStatus: metadata.paymentStatus || 'PENDING',
          dueDate: metadata.dueDate
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  
  const paymentInfo = getPaymentInfo();
  
  // Également essayer de récupérer l'info depuis la facture associée si elle existe
  const getInvoiceStatus = () => {
    if (order.invoice) {
      return {
        paymentStatus: order.invoice.status,
        dueDate: order.invoice.dueDate
      };
    }
    return null;
  }
  
  const invoiceInfo = getInvoiceStatus();
  
  // Combiner les deux sources d'information, avec priorité à la facture
  const finalPaymentStatus = invoiceInfo?.paymentStatus || paymentInfo?.paymentStatus || null;
  const finalDueDate = invoiceInfo?.dueDate || paymentInfo?.dueDate || null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* En-tête de la commande */}
      <div className="px-6 py-4 border-b border-foreground/10 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
        <OrderStatusIcon status={order.status as OrderStatus} />
          <h3 className="font-medium">
            Commande #{order.id.substring(0, 8).toUpperCase()}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground hidden md:block">
            {formatDateToFrench(new Date(order.createdAt))}
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{order.user?.name || 'Client'}</span>
          </div>
          <OrderStatusBadge status={order.status as OrderStatus} />
          
          {/* Ajout du badge de statut de paiement */}
          {finalPaymentStatus && (
            <PaymentStatusBadge 
              status={finalPaymentStatus}
              dueDate={finalDueDate}
            />
          )}
        </div>
      </div>
      
      {/* Aperçu des produits */}
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-3">
          <div className="space-y-4">
            {/* Affichage des produits standard */}
            {renderOrderItems(order.items)}
            
            {/* Affichage des réservations/livraisons */}
            {renderBookings(order.bookings)}
          </div>
        </div>
        
        {/* Actions */}
        <div className="sm:col-span-1 flex sm:flex-col justify-between sm:justify-start items-end sm:border-l sm:border-foreground/10 sm:pl-6">
          <div className="text-right sm:mb-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-semibold text-lg">{order.total.toFixed(2)} CHF</p>
            
            {/* Ajout de l'information sur la méthode de paiement */}
            {paymentInfo?.paymentMethod && (
              <p className="text-xs text-muted-foreground mt-1">
                {paymentInfo.paymentMethod === 'invoice' ? 'Facture à 30 jours' : 'Carte de crédit'}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onViewDetails(order)}
              className="text-custom-accent hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
            >
              Détails <ChevronRight className="h-4 w-4" />
            </button>
            
            {/* Actions conditionnelles selon le statut */}
            {renderActionButtons(order, onUpdateStatus, isUpdating)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper functions to render different parts of the order item
function renderOrderItems(items: OrderItem[]) {
  if (!items.length) return null;
  
  return (
    <div>
      <p className="text-sm font-medium mb-2">Produits :</p>
      <div className="space-y-2">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground/30">
                  <Package className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.quantity} {item.product.unit} ({(item.price * item.quantity).toFixed(2)} CHF)
              </p>
            </div>
          </div>
        ))}
        
        {items.length > 3 && (
          <p className="text-sm text-muted-foreground">
            +{items.length - 3} autres produits
          </p>
        )}
      </div>
    </div>
  );
}

function renderBookings(bookings: Booking[]) {
  if (!bookings?.length) return null;
  
  return (
    <div>
      <p className="text-sm font-medium mb-2">Livraisons programmées :</p>
      <div className="space-y-2">
        {bookings.slice(0, 2).map((booking) => (
          <div key={booking.id} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
              {booking.deliverySlot.product.image ? (
                <img
                  src={booking.deliverySlot.product.image}
                  alt={booking.deliverySlot.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{booking.deliverySlot.product.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateToFrench(new Date(booking.deliverySlot.date))}
                {new Date(booking.deliverySlot.date) < new Date() && (
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    Passé
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Quantité: {booking.quantity} {booking.deliverySlot.product.unit}
              </p>
            </div>
          </div>
        ))}
        
        {bookings.length > 2 && (
          <p className="text-sm text-muted-foreground">
            +{bookings.length - 2} autres livraisons
          </p>
        )}
      </div>
    </div>
  );
}

function renderActionButtons(order: Order, onUpdateStatus: (orderId: string, status: any) => void, isUpdating: boolean) {
  switch (order.status) {
    case 'CONFIRMED':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'SHIPPED')}
          disabled={isUpdating}
          className="text-purple-600 dark:text-purple-400 hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
        >
          <Truck className="h-4 w-4" />
          Marquer expédié
        </button>
      );
    case 'SHIPPED':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
          disabled={isUpdating}
          className="text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
        >
          <Package className="h-4 w-4" />
          Marquer livré
        </button>
      );
    case 'PENDING':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'CONFIRMED')}
          disabled={isUpdating}
          className="text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
        >
          <CheckCircle className="h-4 w-4" />
          Confirmer
        </button>
      );
    default:
      return null;
  }
}