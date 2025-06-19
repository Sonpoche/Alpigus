// components/orders/order-item.tsx
import { motion } from 'framer-motion'
import { Order, OrderItem, Booking } from '@/types/order'
import { formatDateToFrench } from '@/lib/date-utils'
import { formatNumber } from '@/lib/number-utils'
import { OrderStatus } from '@prisma/client'
import Link from 'next/link'
import { 
  User, 
  ChevronRight, 
  Package, 
  Calendar,
  CheckCircle,
  Truck,
  Clock,
  CreditCard
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
      {/* VERSION MOBILE - Layout complètement repensé */}
      <div className="block sm:hidden">
        {/* En-tête mobile compact */}
        <div className="p-4 border-b border-foreground/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <OrderStatusIcon status={order.status as OrderStatus} className="h-5 w-5" />
              <h3 className="font-semibold text-base">
                #{order.id.substring(0, 8).toUpperCase()}
              </h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateToFrench(new Date(order.createdAt))}
            </div>
          </div>
          
          {/* Client */}
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{order.user?.name || 'Client'}</span>
          </div>
          
          {/* Badges status */}
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status as OrderStatus} />
            {finalPaymentStatus && (
              <PaymentStatusBadge 
                status={finalPaymentStatus}
                dueDate={finalDueDate}
              />
            )}
          </div>
        </div>

        {/* Contenu produits mobile */}
        <div className="p-4">
          {/* Produits */}
          {order.items.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-custom-accent" />
                <span className="font-medium text-sm">Produits</span>
              </div>
              <div className="space-y-3">
                {order.items.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-foreground/5 rounded-lg p-3">
                    <div className="w-12 h-12 bg-foreground/10 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(item.quantity)} {item.product.unit}
                      </p>
                      <p className="text-xs font-medium text-custom-accent">
                        {formatNumber(item.price * item.quantity)} CHF
                      </p>
                    </div>
                  </div>
                ))}
                
                {order.items.length > 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{order.items.length - 2} autres produits
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Livraisons */}
          {order.bookings && order.bookings.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Livraisons</span>
              </div>
              <div className="space-y-3">
                {order.bookings.slice(0, 2).map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {booking.deliverySlot.product.image ? (
                        <img
                          src={booking.deliverySlot.product.image}
                          alt={booking.deliverySlot.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{booking.deliverySlot.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateToFrench(new Date(booking.deliverySlot.date))}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {formatNumber(booking.quantity)} {booking.deliverySlot.product.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer mobile avec total et actions */}
        <div className="p-4 border-t border-foreground/10 bg-foreground/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-bold text-lg text-custom-accent">{formatNumber(order.total)} CHF</p>
              {paymentInfo?.paymentMethod && (
                <p className="text-xs text-muted-foreground">
                  {paymentInfo.paymentMethod === 'invoice' ? 'Facture 30j' : 'Carte'}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onViewDetails(order)}
                className="px-4 py-2 bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-1"
              >
                Détails <ChevronRight className="h-4 w-4" />
              </button>
              
              {/* Actions mobiles */}
              {renderActionButtonsMobile(order, onUpdateStatus, isUpdating)}
            </div>
          </div>
        </div>
      </div>

      {/* VERSION DESKTOP - Layout original amélioré */}
      <div className="hidden sm:block">
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
              {renderOrderItems(order.items)}
              {renderBookings(order.bookings)}
            </div>
          </div>
          
          {/* Actions */}
          <div className="sm:col-span-1 flex sm:flex-col justify-between sm:justify-start items-end sm:border-l sm:border-foreground/10 sm:pl-6">
            <div className="text-right sm:mb-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-semibold text-lg">{formatNumber(order.total)} CHF</p>
              
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
              
              {renderActionButtons(order, onUpdateStatus, isUpdating)}
            </div>
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
                {formatNumber(item.quantity)} {item.product.unit} ({formatNumber(item.price * item.quantity)} CHF)
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
                Quantité: {formatNumber(booking.quantity)} {booking.deliverySlot.product.unit}
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

// Actions pour mobile (boutons plus gros)
function renderActionButtonsMobile(order: Order, onUpdateStatus: (orderId: string, status: any) => void, isUpdating: boolean) {
  switch (order.status) {
    case 'CONFIRMED':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'SHIPPED')}
          disabled={isUpdating}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:opacity-80 transition-opacity text-xs font-medium flex items-center gap-1"
        >
          <Truck className="h-3 w-3" />
          Expédier
        </button>
      );
    case 'SHIPPED':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
          disabled={isUpdating}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:opacity-80 transition-opacity text-xs font-medium flex items-center gap-1"
        >
          <Package className="h-3 w-3" />
          Livrer
        </button>
      );
    case 'PENDING':
      return (
        <button
          onClick={() => onUpdateStatus(order.id, 'CONFIRMED')}
          disabled={isUpdating}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:opacity-80 transition-opacity text-xs font-medium flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          Confirmer
        </button>
      );
    default:
      return null;
  }
}

// Actions pour desktop (version originale)
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