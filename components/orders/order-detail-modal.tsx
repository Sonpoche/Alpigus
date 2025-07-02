// components/orders/order-detail-modal.tsx - Version redesignée
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
  CheckCircle,
  Truck,
  CreditCard,
  FileText,
  MapPin,
  Store,
  Phone,
  Home,
  DollarSign,
  BarChart3
} from 'lucide-react'
import OrderStatusBadge from './order-status-badge'
import OrderStatusIcon from './order-status-icon'
import PaymentStatusBadge from './payment-status-badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface OrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
  isUpdating: boolean
}

type TabType = 'resume' | 'client' | 'revenus' | 'facturation'

export default function OrderDetailModal({ 
  order, 
  isOpen, 
  onClose, 
  onUpdateStatus,
  isUpdating
}: OrderDetailModalProps) {
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
      const response = await fetch(`/api/invoices/${invoiceInfo.id}/mark-paid`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Erreur lors du traitement');
      
      toast({
        title: "Succès",
        description: "Facture marquée comme payée",
      });
      
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la facture comme payée",
        variant: "destructive"
      });
    }
  };

  const tabs = [
    { 
      id: 'resume', 
      label: 'Résumé', 
      icon: <BarChart3 className="h-4 w-4" />
    },
    { 
      id: 'client', 
      label: 'Client', 
      icon: <User className="h-4 w-4" />
    },
    { 
      id: 'revenus', 
      label: 'Revenus', 
      icon: <DollarSign className="h-4 w-4" />
    },
    { 
      id: 'facturation', 
      label: 'Facturation', 
      icon: <FileText className="h-4 w-4" />
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
                >
                  <span className={cn(
                    "transition-transform duration-200 h-4 w-4",
                    activeTab === tab.id ? "scale-110" : "group-hover:scale-120"
                  )}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
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
                    <h3 className="text-lg font-semibold text-custom-title mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-custom-accent" />
                      Produits commandés
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
                  </div>

                  {/* Infos livraison */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-custom-title mb-4 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-custom-accent" />
                      Informations de livraison
                    </h3>
                    
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date de commande:</span>
                        <span className="font-medium">{formatDateToFrench(new Date(order.createdAt))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dernière mise à jour:</span>
                        <span className="font-medium">{formatDateToFrench(new Date(order.updatedAt))}</span>
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
                        <span className="text-muted-foreground">Statut:</span>
                        <OrderStatusBadge status={order.status as OrderStatus} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total en bas */}
                <div className="bg-custom-accentLight rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-custom-title">Total de la commande</span>
                    <span className="text-xl font-bold text-custom-accent">{formatNumber(order.total)} CHF</span>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Client */}
            {activeTab === 'client' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-custom-title mb-6 flex items-center gap-2">
                  <User className="h-5 w-5 text-custom-accent" />
                  Informations client
                </h3>
                
                <div className="bg-muted rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Nom</label>
                      <p className="text-lg font-medium text-custom-title">{order.user?.name || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                      <p className="text-lg text-custom-text">{order.user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Téléphone</label>
                      <p className="text-lg text-custom-text">{order.user?.phone || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Mode de paiement</label>
                      <p className="text-lg text-custom-text flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {deliveryInfo?.paymentMethod === 'invoice' ? 'Facturation' : 'Carte de crédit'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adresse de livraison si applicable */}
                {deliveryInfo && (deliveryInfo.type === 'delivery' || deliveryInfo.type === 'livraison') && (
                  <div className="mt-6 bg-blue-50 rounded-lg p-6">
                    <h4 className="font-medium mb-3 text-blue-800 flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Adresse de livraison
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Destinataire :</strong> {deliveryInfo.fullName}
                        {deliveryInfo.company && <span> ({deliveryInfo.company})</span>}
                      </div>
                      <div>
                        <strong>Adresse :</strong> {deliveryInfo.address}
                      </div>
                      <div>
                        <strong>Code postal et ville :</strong> {deliveryInfo.postalCode} {deliveryInfo.city}
                      </div>
                      <div>
                        <strong>Téléphone :</strong> {deliveryInfo.phone}
                      </div>
                      {deliveryInfo.notes && (
                        <div>
                          <strong>Instructions spéciales :</strong> 
                          <p className="italic mt-1">{deliveryInfo.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Onglet Revenus */}
            {activeTab === 'revenus' && (
              <div className="max-w-2xl">
                <h3 className="text-lg sm:text-lg font-semibold text-custom-title mb-4 sm:mb-6 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 sm:h-5 sm:w-5 text-custom-accent" />
                  Détail de vos revenus
                </h3>
                
                <div className="bg-muted border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-4 bg-background rounded-lg border border-border/50">
                    <span className="text-foreground font-medium text-sm sm:text-base">Vos ventes</span>
                    <span className="font-bold text-base sm:text-lg text-green-500">{formatNumber(order.total)} CHF</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-4 bg-background rounded-lg border border-border/50">
                    <span className="text-foreground font-medium text-sm sm:text-base">Commission plateforme (5%)</span>
                    <span className="font-bold text-base sm:text-lg text-red-500">-{formatNumber(order.total * 0.05)} CHF</span>
                  </div>
                  
                  <div className="border-t-2 border-border pt-3 sm:pt-4">
                    <div className="flex justify-between items-center py-3 sm:py-4 px-3 sm:px-4 bg-gradient-to-r from-green-500/10 to-green-400/10 rounded-lg border-2 border-green-500/20">
                      <span className="text-md sm:text-xl font-bold text-foreground flex items-center gap-2">
                        Votre montant
                      </span>
                      <span className="text-xl sm:text-3xl font-bold text-green-400">{formatNumber(order.total * 0.95)} CHF</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Facturation */}
            {activeTab === 'facturation' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-custom-title mb-6 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-custom-accent" />
                  Informations de facturation
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
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Méthode</label>
                      <p className="text-lg text-custom-text flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {paymentInfo?.paymentMethod === 'invoice' ? 'Facture à 30 jours' : 'Carte de crédit'}
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
                  
                  <div className="mt-6 pt-4 border-t border-border flex gap-3">
                    <a
                      href={`/api/orders/${order.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-custom-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Voir la facture
                    </a>
                    
                    {(paymentInfo?.paymentMethod === 'invoice' || invoiceInfo) && 
                     finalPaymentStatus !== 'PAID' && finalPaymentStatus !== 'INVOICE_PAID' && (
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                        onClick={handleMarkAsPaid}
                      >
                        Marquer comme payé
                      </button>
                    )}
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
            
            <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2 w-full sm:w-auto">
              {order.status === 'PENDING' && (
                <button
                  onClick={() => {
                    onUpdateStatus(order.id, 'CONFIRMED');
                    onClose();
                  }}
                  disabled={isUpdating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                  style={{ color: 'white' }}
                >
                  <CheckCircle className="h-4 w-4" style={{ color: 'white' }} />
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
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                  style={{ color: 'white' }}
                >
                  <Truck className="h-4 w-4" style={{ color: 'white' }} />
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
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                  style={{ color: 'white' }}
                >
                  <Package className="h-4 w-4" style={{ color: 'white' }} />
                  Marquer comme livrée
                </button>
              )}
              
              <a
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-custom-accent text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                style={{ color: 'white' }}
              >
                <FileText className="h-4 w-4" style={{ color: 'white' }} />
                Voir la facture
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}