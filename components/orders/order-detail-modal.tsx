// components/orders/order-detail-modal.tsx
import { Order, DeliveryInfo } from '@/types/order'
import { formatDateToFrench } from '@/lib/date-utils'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'
import { 
  XCircle, 
  User, 
  Package, 
  Calendar, 
  CheckCircle,
  Truck,
  ShoppingBag,
  CreditCard,
  FileText
} from 'lucide-react'
import OrderStatusBadge from './order-status-badge'
import OrderStatusIcon from './order-status-icon'
import PaymentStatusBadge from './payment-status-badge'

interface OrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
  isUpdating: boolean
}

export default function OrderDetailModal({ 
  order, 
  isOpen, 
  onClose, 
  onUpdateStatus,
  isUpdating
}: OrderDetailModalProps) {
  // Parse delivery info from order metadata
  const getDeliveryInfo = (order: Order): DeliveryInfo | null => {
    if (!order.metadata) return null;
    
    try {
      return JSON.parse(order.metadata) as DeliveryInfo;
    } catch {
      return null;
    }
  };
  
  const deliveryInfo = getDeliveryInfo(order);

  // Extrait les informations de paiement
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
  
  // Récupère également les informations depuis la facture si elle existe
  const getInvoiceInfo = () => {
    if (order.invoice) {
      return {
        id: order.invoice.id,
        status: order.invoice.status,
        amount: order.invoice.amount,
        dueDate: order.invoice.dueDate,
        paidAt: order.invoice.paidAt
      };
    }
    return null;
  }
  
  const invoiceInfo = getInvoiceInfo();
  
  // Déterminer le statut final du paiement
  const finalPaymentStatus = invoiceInfo?.status || paymentInfo?.paymentStatus || null;
  const finalDueDate = invoiceInfo?.dueDate || paymentInfo?.dueDate || null;

  // Fonction pour marquer la facture comme payée
  const handleMarkAsPaid = async () => {
    if (!invoiceInfo?.id) return;
    
    try {
      // Appel à l'API pour marquer la facture comme payée
      const response = await fetch(`/api/invoices/${invoiceInfo.id}/mark-paid`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Erreur lors du traitement');
      
      // Fermer le modal - la page sera rafraîchie pour voir les changements
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      // Gérer l'erreur (avec toast par exemple)
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-foreground/10 flex justify-between items-center sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
            <OrderStatusIcon status={order.status as OrderStatus} />
              <h3 className="font-medium text-lg">
                Commande #{order.id.substring(0, 8).toUpperCase()}
              </h3>
              <OrderStatusBadge status={order.status as OrderStatus} />
            </div>
            
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Informations client */}
            <div className="bg-foreground/5 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-foreground/60" />
                Informations client
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{order.user?.name || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{order.user?.phone || 'Non spécifié'}</p>
                </div>
              </div>
            </div>
            
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de commande</p>
                <p className="font-medium">{formatDateToFrench(new Date(order.createdAt))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                <p className="font-medium">{formatDateToFrench(new Date(order.updatedAt))}</p>
              </div>
              
              {/* Informations de livraison */}
              {deliveryInfo && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Mode de livraison</p>
                    <p className="font-medium">
                      {deliveryInfo.type === 'pickup' 
                        ? 'Retrait sur place' 
                        : 'Livraison à domicile'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paiement</p>
                    <p className="font-medium">
                      {deliveryInfo.paymentMethod === 'invoice' 
                        ? 'Facturation' 
                        : 'Carte de crédit'}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Adresse de livraison si applicable */}
            {deliveryInfo?.address && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Adresse de livraison</p>
                <p className="p-3 bg-foreground/5 rounded-md">
                  {deliveryInfo.address}
                </p>
              </div>
            )}
            
            {/* Notes de livraison si applicable */}
            {deliveryInfo?.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Instructions spéciales</p>
                <p className="p-3 bg-foreground/5 rounded-md">
                  {deliveryInfo.notes}
                </p>
              </div>
            )}
            
            {/* Ajout d'une section détaillée sur le paiement */}
            <div className="border-t border-foreground/10 pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-foreground/60" />
                Informations de paiement
              </h4>
              
              <div className="bg-foreground/5 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Statut du paiement:</span>
                    {finalPaymentStatus && (
                      <PaymentStatusBadge 
                        status={finalPaymentStatus}
                        dueDate={finalDueDate}
                      />
                    )}
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Méthode: {paymentInfo?.paymentMethod === 'invoice' ? 'Facture à 30 jours' : 'Carte de crédit'}
                    </span>
                  </div>
                </div>
                
                {invoiceInfo && (
                  <div className="mt-2 pt-2 border-t border-foreground/10">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">
                        <span className="font-medium">N° Facture:</span> {invoiceInfo.id.substring(0, 8).toUpperCase()}
                      </p>
                      
                      <Link
                        href={`/invoices/${invoiceInfo.id}`}
                        className="text-sm text-custom-accent hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Voir la facture
                      </Link>
                    </div>
                    
                    {finalDueDate && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Date d'échéance:</span> {new Date(finalDueDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    
                    {invoiceInfo.paidAt && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Date de paiement:</span> {new Date(invoiceInfo.paidAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                )}
                
                {(paymentInfo?.paymentMethod === 'invoice' || invoiceInfo) && 
                 finalPaymentStatus !== 'PAID' && finalPaymentStatus !== 'INVOICE_PAID' && (
                  <div className="mt-3">
                    <button
                      className="px-3 py-1 text-sm bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity"
                      onClick={handleMarkAsPaid}
                    >
                      Marquer comme payé
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Produits */}
            <div>
              <p className="font-medium mb-3">Produits commandés</p>
              <div className="space-y-4 divide-y divide-foreground/10">
                {order.items.map((item) => (
                  <div key={item.id} className="flex pt-4 first:pt-0">
                    <div className="w-16 h-16 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <Link href={`/producer/${item.product.id}/edit`} className="font-medium hover:text-custom-accent">
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Quantité: {item.quantity} {item.product.unit}
                      </p>
                      <p className="text-sm">
                        Prix unitaire: {item.price.toFixed(2)} CHF
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-medium">{(item.price * item.quantity).toFixed(2)} CHF</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Livraisons programmées */}
            {order.bookings && order.bookings.length > 0 && (
              <div>
                <p className="font-medium mb-3">Livraisons programmées</p>
                <div className="space-y-4 divide-y divide-foreground/10">
                  {order.bookings.map((booking) => {
                    const isPast = new Date(booking.deliverySlot.date) < new Date();
                    return (
                      <div key={booking.id} className="flex pt-4 first:pt-0">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          {booking.deliverySlot.product.image ? (
                            <img
                              src={booking.deliverySlot.product.image}
                              alt={booking.deliverySlot.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <p className="font-medium">{booking.deliverySlot.product.name}</p>
                            {isPast && (
                              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                Passé
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isPast ? "Livraison était prévue le " : "Livraison prévue le "} 
                            {formatDateToFrench(new Date(booking.deliverySlot.date))}
                          </p>
                          <p className="text-sm mt-1">
                            Quantité: {booking.quantity} {booking.deliverySlot.product.unit}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            {(booking.price ? booking.price * booking.quantity : 
                              booking.deliverySlot.product.price ? booking.deliverySlot.product.price * booking.quantity : 
                              0).toFixed(2)} CHF
                          </p>
                          </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Résumé des coûts */}
            <div className="border-t border-foreground/10 pt-4">
              <div className="flex justify-between mb-2">
                <p>Sous-total</p>
                <p>{order.total.toFixed(2)} CHF</p>
              </div>
              {deliveryInfo?.type === 'delivery' && (
                <div className="flex justify-between mb-2">
                  <p>Frais de livraison</p>
                  <p>15.00 CHF</p>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-foreground/10">
                <p>Total</p>
                <p>{((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total).toFixed(2)} CHF</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-4 justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
              >
                Fermer
              </button>
              
              <div className="flex gap-2">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(order.id, 'CONFIRMED');
                      onClose();
                    }}
                    disabled={isUpdating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirmer la commande
                  </button>
                )}
                
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(order.id, 'SHIPPED');
                      onClose();
                    }}
                    disabled={isUpdating}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Truck className="h-5 w-5" />
                    Marquer comme expédiée
                  </button>
                )}
                
                {order.status === 'SHIPPED' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(order.id, 'DELIVERED');
                      onClose();
                    }}
                    disabled={isUpdating}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Package className="h-5 w-5" />
                    Marquer comme livrée
                  </button>
                )}
                
                {/* Télécharger la facture - pour tous les statuts */}
                <button
                  className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Télécharger facture
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
                        