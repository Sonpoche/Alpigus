// components/orders/client-order-detail-modal.tsx - Version avec gestion du statut de paiement
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Order, DeliveryInfo } from '@/types/order'
import { formatDateToFrench } from '@/lib/date-utils'
import { formatNumber } from '@/lib/number-utils'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'
import { 
  XCircle, 
  User, 
  Package, 
  Calendar, 
  CreditCard,
  FileText,
  MapPin,
  Store,
  Phone,
  Home,
  BarChart3,
  Truck,
  CheckCircle
} from 'lucide-react'
import OrderStatusBadge from './order-status-badge'
import OrderStatusIcon from './order-status-icon'
import PaymentStatusBadge from './payment-status-badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Réutilisation des composants d'adresse existants
import OrderPickupAddress from './order-pickup-adress'
import OrderDeliveryAddress from './order-delivery-adress'

interface ClientOrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
}

type TabType = 'resume' | 'livraison' | 'paiement'

export default function ClientOrderDetailModal({ 
  order, 
  isOpen, 
  onClose
}: ClientOrderDetailModalProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('resume')
  
  // Parse delivery info from order metadata
  const getDeliveryInfo = (order: Order): DeliveryInfo | null => {
    if (!order.metadata) return null;
    
    try {
      const metadata = JSON.parse(order.metadata);
      
      let deliveryType = 'pickup';
      
      if (metadata.deliveryType) {
        deliveryType = metadata.deliveryType;
      } else if (metadata.type) {
        deliveryType = metadata.type;
      } else if (metadata.deliveryInfo?.type) {
        deliveryType = metadata.deliveryInfo.type;
      }
      
      return {
        type: deliveryType,
        fullName: metadata.deliveryInfo?.fullName || metadata.fullName,
        company: metadata.deliveryInfo?.company || metadata.company,
        address: metadata.deliveryInfo?.address || metadata.address,
        postalCode: metadata.deliveryInfo?.postalCode || metadata.postalCode,
        city: metadata.deliveryInfo?.city || metadata.city,
        phone: metadata.deliveryInfo?.phone || metadata.phone,
        notes: metadata.deliveryInfo?.notes || metadata.notes,
        paymentMethod: metadata.paymentMethod
      } as DeliveryInfo;
    } catch (e) {
      return null;
    }
  };
  
  const deliveryInfo = getDeliveryInfo(order);

  // Fonction pour déterminer si la facture/commande est payée
  const getPaymentStatus = () => {
    let isPaid = false;
    let paidAt = null;
    let paymentMethod = null;
    let paymentStatus = null;
    
    // 1. Vérifier dans la facture (si elle existe)
    if (order.invoice) {
      isPaid = order.invoice.status === 'PAID';
      paidAt = order.invoice.paidAt ? new Date(order.invoice.paidAt) : null;
      paymentMethod = order.invoice.paymentMethod;
      paymentStatus = order.invoice.status;
    }
    
    // 2. Vérifier dans les métadonnées de la commande
    if (!isPaid && order.metadata) {
      try {
        const metadata = JSON.parse(order.metadata);
        isPaid = metadata.paymentStatus === 'PAID' || metadata.paymentStatus === 'INVOICE_PAID';
        if (isPaid && metadata.paidAt) {
          paidAt = new Date(metadata.paidAt);
        }
        if (!paymentMethod) {
          paymentMethod = metadata.paymentMethod;
        }
        if (!paymentStatus) {
          paymentStatus = metadata.paymentStatus;
        }
      } catch (e) {
        // Ignore l'erreur de parsing
      }
    }
    
    // 3. Vérifier le statut de la commande (fallback)
    if (!isPaid) {
      isPaid = order.status === 'INVOICE_PAID';
    }
    
    // Si pas de méthode de paiement trouvée, utiliser celle des métadonnées de livraison
    if (!paymentMethod && deliveryInfo?.paymentMethod) {
      paymentMethod = deliveryInfo.paymentMethod;
    }
    
    return {
      isPaid,
      paidAt,
      paymentMethod,
      paymentStatus: paymentStatus || (isPaid ? 'PAID' : 'PENDING')
    };
  };

  const paymentStatus = getPaymentStatus();
  
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
  const finalPaymentStatus = invoiceInfo?.status || paymentStatus.paymentStatus || null;
  const finalDueDate = invoiceInfo?.dueDate || null;

  const tabs = [
    { 
      id: 'resume', 
      label: 'Résumé', 
      icon: <BarChart3 className="h-4 w-4" />
    },
    { 
      id: 'livraison', 
      label: 'Livraison', 
      icon: <Truck className="h-4 w-4" />
    },
    { 
      id: 'paiement', 
      label: 'Paiement', 
      icon: <CreditCard className="h-4 w-4" />
    }
  ]

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 transition-opacity">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header avec gradient très léger - adaptatif */}
          <div className="bg-gradient-to-r from-muted/30 to-background border-b border-border text-foreground p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                  Commande #{order.id.substring(0, 8).toUpperCase()}
                </h2>
                <div className="px-2 sm:px-3 py-1 bg-muted bg-opacity-60 rounded-full text-xs sm:text-sm font-medium">
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          {/* Navigation par onglets - Style "pill" moderne */}
          <div className="bg-muted px-4 sm:px-6 py-4">
            <nav className="flex space-x-1 bg-muted-foreground/20 p-1 rounded-xl w-full sm:max-w-fit overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "px-4 sm:px-6 py-3 rounded-lg font-semibold flex items-center gap-2 sm:gap-3 transition-all duration-300 relative overflow-hidden whitespace-nowrap text-sm sm:text-base flex-shrink-0",
                    activeTab === tab.id
                      ? "bg-custom-accent text-white shadow-lg transform hover:scale-105"
                      : "text-muted-foreground hover:text-custom-accent hover:bg-background font-medium"
                  )}
                  style={activeTab === tab.id ? { color: 'white !important' } : {}}
                >
                  <span 
                    className={cn(
                      "transition-transform duration-200 h-4 w-4",
                      activeTab === tab.id ? "scale-110" : "group-hover:scale-120"
                    )}
                    style={activeTab === tab.id ? { color: 'white !important' } : {}}
                  >
                    {tab.icon}
                  </span>
                  <span 
                    className="hidden sm:inline"
                    style={activeTab === tab.id ? { color: 'white !important' } : {}}
                  >
                    {tab.label}
                  </span>
                  <span 
                    className="sm:hidden"
                    style={activeTab === tab.id ? { color: 'white !important' } : {}}
                  >
                    {tab.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            
            {/* Onglet Résumé */}
            {activeTab === 'resume' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Produits commandés */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-custom-title mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                      Vos produits
                    </h3>
                    
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="bg-muted rounded-lg p-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-custom-accent rounded-lg flex items-center justify-center text-white text-2xl">
                              {item.product.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                '🍄'
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-custom-title">{item.product.name}</h4>
                              <p className="text-sm text-muted-foreground">Quantité: {formatNumber(item.quantity)} {item.product.unit}</p>
                              <p className="text-sm text-muted-foreground">Prix unitaire: {formatNumber(item.price)} CHF</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-custom-accent">{formatNumber(item.price * item.quantity)} CHF</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Livraisons programmées */}
                    {order.bookings && order.bookings.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          Livraisons programmées
                        </h4>
                        <div className="space-y-3">
                          {order.bookings.map((booking) => {
                            const isPast = new Date(booking.deliverySlot.date) < new Date();
                            const bookingPrice = booking.price || booking.deliverySlot.product.price || 0;
                            return (
                              <div key={booking.id} className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    {booking.deliverySlot.product.image ? (
                                      <img
                                        src={booking.deliverySlot.product.image}
                                        alt={booking.deliverySlot.product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-custom-title flex items-center gap-2">
                                      {booking.deliverySlot.product.name}
                                      {isPast && (
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                          Passé
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {isPast ? "Livraison était prévue le " : "Livraison prévue le "} 
                                      {formatDateToFrench(new Date(booking.deliverySlot.date))}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Quantité: {formatNumber(booking.quantity)} {booking.deliverySlot.product.unit}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-blue-600">{formatNumber(bookingPrice * booking.quantity)} CHF</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Résumé de votre commande */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-custom-title mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                      Résumé de votre commande
                    </h3>
                    
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date de commande:</span>
                        <span className="font-medium">{formatDateToFrench(new Date(order.createdAt))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Statut:</span>
                        <OrderStatusBadge status={order.status as OrderStatus} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mode de livraison:</span>
                        <span className="font-medium">
                          {deliveryInfo?.type === 'pickup' || deliveryInfo?.type === 'retrait' 
                            ? 'Retrait sur place' 
                            : deliveryInfo?.type === 'delivery' || deliveryInfo?.type === 'livraison'
                            ? 'Livraison à domicile'
                            : deliveryInfo?.type || 'Non spécifié'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mode de paiement:</span>
                        <span className="font-medium">
                          {paymentStatus.paymentMethod === 'invoice' ? 'Facturation' : 'Carte de crédit'}
                        </span>
                      </div>
                      {paymentStatus.isPaid && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Statut du paiement:</span>
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Payé</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total de votre commande ou Commande payée */}
                <div className="border-t border-border pt-6">
                  {paymentStatus.isPaid ? (
                    // Affichage pour une commande payée
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
                          Commande payée
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Sous-total produits</span>
                          <span>{formatNumber(order.total)} CHF</span>
                        </div>
                        {deliveryInfo?.type === 'delivery' && (
                          <div className="flex justify-between">
                            <span>Frais de livraison</span>
                            <span>{formatNumber(15)} CHF</span>
                          </div>
                        )}
                        <div className="border-t border-green-300 pt-2 flex justify-between items-center">
                          <span className="text-lg font-semibold">Total payé</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatNumber((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total)} CHF
                          </span>
                        </div>
                        {paymentStatus.paidAt && (
                          <div className="mt-3 pt-3 border-t border-green-300">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Payé le {formatDateToFrench(paymentStatus.paidAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Affichage pour une commande non payée
                    <div className="bg-custom-accentLight rounded-lg p-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Sous-total produits</span>
                          <span>{formatNumber(order.total)} CHF</span>
                        </div>
                        {deliveryInfo?.type === 'delivery' && (
                          <div className="flex justify-between">
                            <span>Frais de livraison</span>
                            <span>{formatNumber(15)} CHF</span>
                          </div>
                        )}
                        <div className="border-t border-custom-accent pt-2 flex justify-between items-center">
                          <span className="text-xl font-semibold text-custom-title">Total à payer</span>
                          <span className="text-3xl font-bold text-custom-accent">
                            {formatNumber((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total)} CHF
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Onglet Livraison */}
            {activeTab === 'livraison' && (
              <div className="max-w-2xl">
                <h3 className="text-base sm:text-lg font-semibold text-custom-title mb-4 sm:mb-6 flex items-center gap-2">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                  Informations de livraison
                </h3>
                
                <div className="bg-muted rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Mode de livraison</label>
                      <p className="text-lg font-medium text-custom-title">
                        {deliveryInfo?.type === 'pickup' || deliveryInfo?.type === 'retrait' 
                          ? 'Retrait sur place' 
                          : deliveryInfo?.type === 'delivery' || deliveryInfo?.type === 'livraison'
                          ? 'Livraison à domicile'
                          : deliveryInfo?.type || 'Non spécifié'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Statut</label>
                      <OrderStatusBadge status={order.status as OrderStatus} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Date de commande</label>
                      <p className="text-lg text-custom-text">{formatDateToFrench(new Date(order.createdAt))}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Dernière mise à jour</label>
                      <p className="text-lg text-custom-text">{formatDateToFrench(new Date(order.updatedAt))}</p>
                    </div>
                  </div>
                </div>

                {/* Adresse de retrait sur place */}
                {deliveryInfo?.type === 'pickup' && (
                  <OrderPickupAddress 
                    orderId={order.id} 
                    deliveryType="pickup" 
                  />
                )}
                
                {/* Adresse de livraison à domicile */}
                {deliveryInfo?.type === 'delivery' && (
                  <OrderDeliveryAddress 
                    orderId={order.id} 
                    deliveryType="delivery" 
                  />
                )}
              </div>
            )}

            {/* Onglet Paiement */}
            {activeTab === 'paiement' && (
              <div className="max-w-2xl">
                <h3 className="text-base sm:text-lg font-semibold text-custom-title mb-4 sm:mb-6 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                  Informations de paiement
                </h3>
                
                <div className="bg-muted rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Statut du paiement</label>
                      {finalPaymentStatus && (
                        <PaymentStatusBadge 
                          status={finalPaymentStatus}
                          dueDate={finalDueDate}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Méthode de paiement</label>
                      <p className="text-lg text-custom-text flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {paymentStatus.paymentMethod === 'invoice' ? 'Facturation (30 jours)' : 'Carte de crédit'}
                      </p>
                    </div>
                    {invoiceInfo && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">N° Facture</label>
                          <p className="text-lg font-mono text-custom-text">{invoiceInfo.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                        {finalDueDate && (
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Date d'échéance</label>
                            <p className="text-lg text-custom-text">{new Date(finalDueDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                        )}
                        {invoiceInfo.paidAt && (
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Date de paiement</label>
                            <p className="text-lg text-custom-text">{new Date(invoiceInfo.paidAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Résumé du montant */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="bg-background rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold text-custom-title mb-3">
                        {paymentStatus.isPaid ? 'Détail de votre paiement' : 'Détail à payer'}
                      </h4>
                      <div className="flex justify-between">
                        <span>Produits</span>
                        <span>{formatNumber(order.total)} CHF</span>
                      </div>
                      {deliveryInfo?.type === 'delivery' && (
                        <div className="flex justify-between">
                          <span>Frais de livraison</span>
                          <span>{formatNumber(15)} CHF</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                        <span>{paymentStatus.isPaid ? 'Total payé' : 'Total à payer'}</span>
                        <span className={cn(
                          paymentStatus.isPaid ? 'text-green-600' : 'text-custom-accent'
                        )}>
                          {formatNumber((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total)} CHF
                        </span>
                      </div>
                      {paymentStatus.isPaid && paymentStatus.paidAt && (
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Payé le {formatDateToFrench(paymentStatus.paidAt)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-border flex gap-3">
                    
                    
                    <a
                      href={`/api/orders/${order.id}/invoice/client`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-custom-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
                      style={{ color: 'white !important' }}
                    >
                      <FileText className="h-4 w-4 mr-2" style={{ color: 'white !important' }} />
                      Télécharger la facture
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-muted px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-border gap-3 sm:gap-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors order-2 sm:order-1"
            >
              Fermer
            </button>
            
            <div className="flex gap-3 order-1 sm:order-2 w-full sm:w-auto">
              <a
                href={`/api/orders/${order.id}/invoice/client`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-custom-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                style={{ color: 'white !important' }}
              >
                <FileText className="h-4 w-4" style={{ color: 'white !important' }} />
                Télécharger facture
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}