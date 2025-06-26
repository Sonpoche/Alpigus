// components/orders/order-detail-modal.tsx
import React from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  ShoppingBag,
  CreditCard,
  FileText,
  MapPin,
  Store,
  Phone,
  Home
} from 'lucide-react'
import OrderStatusBadge from './order-status-badge'
import OrderStatusIcon from './order-status-icon'
import PaymentStatusBadge from './payment-status-badge'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

interface OrderPickupAddressProps {
  orderId: string
  deliveryType: string
}

function OrderPickupAddress({ orderId, deliveryType }: OrderPickupAddressProps) {
  const [producerDetails, setProducerDetails] = useState<{
    companyName: string
    address: string
    phone: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si ce n'est pas un retrait sur place, ne rien faire
    if (deliveryType !== 'pickup') {
      setIsLoading(false)
      return
    }

    async function fetchProducerAddress() {
      try {
        setIsLoading(true)
        // Récupérer les détails du producteur pour cette commande
        const response = await fetch(`/api/orders/${orderId}/producer-details`)
        
        if (!response.ok) {
          throw new Error('Impossible de récupérer les informations du producteur')
        }
        
        const data = await response.json()
        setProducerDetails(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger l\'adresse de retrait')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducerAddress()
  }, [orderId, deliveryType])

  // Ne rien afficher si ce n'est pas un retrait sur place
  if (deliveryType !== 'pickup') {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  if (error || !producerDetails) {
    return null; // Ou simplement ne rien afficher au lieu du message d'erreur
  }
  
  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-4 mt-4">
      <h3 className="font-medium text-base mb-3 flex items-center gap-2">
        <Store className="h-5 w-5 text-custom-accent" />
        Adresse de retrait
      </h3>
      
      <div className="space-y-2 text-sm">
        <p className="font-semibold">{producerDetails.companyName}</p>
        
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <p className="text-foreground/80 whitespace-pre-line">{producerDetails.address}</p>
        </div>
        
        {producerDetails.phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
            <p className="text-foreground/80">{producerDetails.phone}</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-foreground/60 bg-foreground/5 p-3 rounded-md">
        Veuillez vous présenter avec votre numéro de commande lors du retrait.
      </div>
    </div>
  )
}

interface OrderDeliveryAddressProps {
  orderId: string
  deliveryType: string
}

function OrderDeliveryAddress({ orderId, deliveryType }: OrderDeliveryAddressProps) {
  const [deliveryDetails, setDeliveryDetails] = useState<{
    fullName: string
    company?: string
    address: string
    postalCode: string
    city: string
    phone: string
    notes?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si ce n'est pas une livraison à domicile, ne rien faire
    if (deliveryType !== 'delivery') {
      setIsLoading(false)
      return
    }

    async function fetchDeliveryAddress() {
      try {
        setIsLoading(true)
        // Récupérer les détails de livraison pour cette commande
        const response = await fetch(`/api/orders/${orderId}/delivery-details`)
        
        if (!response.ok) {
          throw new Error('Impossible de récupérer les informations de livraison')
        }
        
        const data = await response.json()
        setDeliveryDetails(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger l\'adresse de livraison')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeliveryAddress()
  }, [orderId, deliveryType])

  // Ne rien afficher si ce n'est pas une livraison à domicile
  if (deliveryType !== 'delivery') {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  if (error || !deliveryDetails) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
        Informations de livraison non disponibles. Contactez le client directement.
      </div>
    )
  }

  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-4 mt-4">
      <h3 className="font-medium text-base mb-3 flex items-center gap-2">
        <Home className="h-5 w-5 text-custom-accent" />
        Adresse de livraison
      </h3>
      
      <div className="space-y-3 text-sm">
        {/* Informations du destinataire */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{deliveryDetails.fullName}</p>
            {deliveryDetails.company && (
              <p className="text-foreground/70">{deliveryDetails.company}</p>
            )}
          </div>
        </div>
        
        {/* Adresse complète */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-foreground/80">{deliveryDetails.address}</p>
            <p className="text-foreground/80">
              {deliveryDetails.postalCode} {deliveryDetails.city}
            </p>
          </div>
        </div>
        
        {/* Téléphone */}
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
          <p className="text-foreground/80">{deliveryDetails.phone}</p>
        </div>
        
        {/* Notes de livraison si présentes */}
        {deliveryDetails.notes && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-custom-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Instructions spéciales :</p>
              <p className="text-foreground/80 italic">{deliveryDetails.notes}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-foreground/60 bg-foreground/5 p-3 rounded-md">
        <p className="font-medium mb-1">Informations de livraison :</p>
        <p>• Frais de livraison : {formatNumber(15)} CHF</p>
        <p>• Numéro de commande : #{orderId.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  )
}

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
  const { data: session } = useSession()
  const { toast } = useToast()
  
  // Parse delivery info from order metadata
  const getDeliveryInfo = (order: Order): DeliveryInfo | null => {
    if (!order.metadata) return null;
    
    try {
      const metadata = JSON.parse(order.metadata);
      
      // Essayer différentes structures possibles
      let deliveryType = 'pickup'; // valeur par défaut
      
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
                      {deliveryInfo.type === 'pickup' || deliveryInfo.type === 'retrait' 
                        ? 'Retrait sur place' 
                        : deliveryInfo.type === 'delivery' || deliveryInfo.type === 'livraison'
                        ? 'Livraison à domicile'
                        : deliveryInfo.type || 'Non spécifié'}
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
            
            {/* Adresse de retrait sur place - SEULEMENT POUR LES CLIENTS */}
            {deliveryInfo?.type === 'pickup' && session?.user?.role === 'CLIENT' && (
              <OrderPickupAddress 
                orderId={order.id} 
                deliveryType="pickup" 
              />
            )}
            
            {/* Adresse de livraison à domicile - SEULEMENT POUR LES CLIENTS */}
            {deliveryInfo?.type === 'delivery' && session?.user?.role === 'CLIENT' && (
              <OrderDeliveryAddress 
                orderId={order.id} 
                deliveryType="delivery" 
              />
            )}
            
            {/* Notes de livraison si applicable et pas déjà affichées dans OrderDeliveryAddress */}
            {deliveryInfo?.notes && deliveryInfo?.type !== 'delivery' && (
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
                        Quantité: {formatNumber(item.quantity)} {item.product.unit}
                      </p>
                      <p className="text-sm">
                        Prix unitaire: {formatNumber(item.price)} CHF
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-medium">{formatNumber(item.price * item.quantity)} CHF</p>
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
                    const bookingPrice = booking.price || booking.deliverySlot.product.price || 0;
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
                            Quantité: {formatNumber(booking.quantity)} {booking.deliverySlot.product.unit}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            {formatNumber(bookingPrice * booking.quantity)} CHF
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
                <p>{formatNumber(order.total)} CHF</p>
              </div>
              {deliveryInfo?.type === 'delivery' && (
                <div className="flex justify-between mb-2">
                  <p>Frais de livraison</p>
                  <p>{formatNumber(15)} CHF</p>
                </div>
              )}

              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-foreground/10">
                <p>Total</p>
                <p>{formatNumber((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total)} CHF</p>
              </div>
            </div>

            {/* Affichage de la commission pour les producteurs */}
            {session?.user?.role === 'PRODUCER' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md mb-2 border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-2">
                  💰 Détail de vos revenus
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Vos ventes:</span>
                    <span>{formatNumber(order.total)} CHF</span>
                  </div>
                  <div className="flex justify-between text-orange-700 dark:text-orange-300">
                    <span>Commission plateforme (5%):</span>
                    <span>-{formatNumber(order.total * 0.05)} CHF</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700 dark:text-green-300 pt-1 border-t border-orange-200">
                    <span>Votre montant:</span>
                    <span>{formatNumber(order.total * 0.95)} CHF</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-foreground/10">
              <p>Total commande</p>
              <p>{formatNumber((deliveryInfo?.type === 'delivery' ? 15 : 0) + order.total)} CHF</p>
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
    {/* Boutons de changement de statut - SEULEMENT POUR PRODUCTEURS/ADMINS */}
    {session?.user?.role !== 'CLIENT' && (
      <>
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
      </>
    )}
    
    {/* Bouton télécharger facture - TOUJOURS VISIBLE POUR TOUS LES RÔLES */}
    <a
      href={session?.user?.role === 'CLIENT' 
        ? `/api/orders/${order.id}/invoice/client`
        : `/api/orders/${order.id}/invoice`
      }
      target="_blank"
      rel="noopener noreferrer"
      className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 inline-flex no-underline"
    >
      <FileText className="h-5 w-5" />
      Télécharger facture
    </a>
  </div>
</div>
         </div>
       </div>
     </div>
   </div>
 );
}