// app/(protected)/admin/orders/[id]/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/number-utils'
import { 
    ArrowLeft, 
    Clock, 
    Package, 
    Truck, 
    User, 
    AlertCircle,
    CalendarDays,
    Mail,
    Phone,
    FileText,
    CreditCard,
    ReceiptText,
    MessageSquare,
    CheckCircle
  } from 'lucide-react' 
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingNotification, setIsSendingNotification] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/orders/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la commande')
      }
      
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la commande",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleContactClient = async () => {
    // Cette fonction pourrait ouvrir une interface de message ou envoyer un email préconfiguré
    toast({
      title: "En développement",
      description: "Cette fonctionnalité est en cours de développement"
    })
  }

  const handleContactProducer = async (producerId: string) => {
    // Cette fonction pourrait ouvrir une interface de message ou envoyer un email préconfiguré
    toast({
      title: "En développement",
      description: "Cette fonctionnalité est en cours de développement"
    })
  }

  const handleSendReminder = async () => {
    try {
      setIsSendingNotification(true)
      
      // Envoyer une notification au producteur et/ou au client
      const response = await fetch(`/api/admin/orders/${params.id}/send-reminder`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du rappel')
      }
      
      toast({
        title: "Rappel envoyé",
        description: "Le rappel a été envoyé avec succès"
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le rappel",
        variant: "destructive"
      })
    } finally {
      setIsSendingNotification(false)
    }
  }

  // Fonction pour obtenir la couleur de badge en fonction du statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'CONFIRMED':
        return 'success'
      case 'SHIPPED':
        return 'info'
      case 'DELIVERED':
        return 'success'
      case 'CANCELLED':
        return 'destructive'
      case 'INVOICE_PENDING':
        return 'warning'
      case 'INVOICE_PAID':
        return 'success'
      case 'INVOICE_OVERDUE':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-500 mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold mb-2">Commande introuvable</h3>
        <p className="text-muted-foreground mb-4">La commande demandée n'a pas été trouvée</p>
        <Button onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    )
  }

  // Grouper les articles par producteur
  const itemsByProducer: Record<string, any[]> = {}
  order.items.forEach((item: any) => {
    const producerId = item.product.producer.id
    if (!itemsByProducer[producerId]) {
      itemsByProducer[producerId] = []
    }
    itemsByProducer[producerId].push(item)
  })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-1 rounded-full hover:bg-foreground/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Commande #{order.id.substring(0, 8)}</h1>
            <p className="text-muted-foreground">
              {format(new Date(order.createdAt), 'PPPP', { locale: fr })}
            </p>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(order.status)} className="text-base px-3 py-1">
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-foreground/10 flex justify-between items-center">
              <h2 className="font-semibold">Détails de la commande</h2>
              <div>
                {/* Actions administratives */}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleSendReminder}
                  disabled={isSendingNotification}
                  className="text-xs"
                >
                  {isSendingNotification ? (
                    <>
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Envoyer un rappel
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Détails des articles par producteur */}
            {Object.entries(itemsByProducer).map(([producerId, items]) => {
              const producer = items[0].product.producer
              
              return (
                <div key={producerId} className="border-b border-foreground/10 last:border-b-0">
                  <div className="p-4 bg-foreground/5 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{producer.companyName || producer.user.name}</div>
                      <div className="text-xs text-muted-foreground">{producer.user.email}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleContactProducer(producerId)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contacter
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-foreground/10">
                          <th className="px-4 py-3 text-left text-sm font-medium">Produit</th>
                          <th className="px-4 py-3 text-center text-sm font-medium">Quantité</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Prix unitaire</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any) => (
                          <tr key={item.id} className="border-b border-foreground/10 last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                {item.product.image ? (
                                  <div className="h-10 w-10 rounded-md overflow-hidden mr-3 bg-foreground/5">
                                    <img 
                                      src={item.product.image} 
                                      alt={item.product.name} 
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-md overflow-hidden mr-3 bg-foreground/5 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-foreground/40" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{item.product.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.product.type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {formatNumber(item.quantity)} {item.product.unit}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(item.price)} CHF
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatNumber(item.price * item.quantity)} CHF
                            </td>
                          </tr>
                        ))}
                        
                        {/* Sous-total par producteur */}
                        <tr className="bg-foreground/5">
                          <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium">
                            Sous-total ({items.length} article{items.length > 1 ? 's' : ''})
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatNumber(items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0))} CHF
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            
            {/* Total et autres frais */}
            <div className="p-4 border-t border-foreground/10 bg-foreground/5">
              <div className="flex justify-end">
                <div className="w-full max-w-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-sm">Sous-total</span>
                    <span className="font-medium">{formatNumber(order.total)} CHF</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-sm">Livraison</span>
                    <span className="font-medium">{formatNumber(0)} CHF</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-foreground/10 mt-2">
                    <span className="text-base font-medium">Total</span>
                    <span className="text-lg font-bold">{formatNumber(order.total)} CHF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline de la commande */}
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm mt-6 p-4">
            <h2 className="font-semibold mb-4">Suivi de la commande</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mr-3 bg-custom-accent/10 p-2 rounded-full">
                  <Clock className="h-5 w-5 text-custom-accent" />
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">Commande reçue</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    La commande a été passée par le client et est en attente de traitement.
                  </p>
                </div>
              </div>
              
              {/* Vous pouvez ajouter d'autres étapes en fonction du statut de la commande */}
              {order.status !== 'PENDING' && (
                <div className="flex items-start">
                  <div className="mr-3 bg-green-500/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Commande confirmée</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      La commande a été confirmée par le(s) producteur(s).
                    </p>
                  </div>
                </div>
              )}
              
              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <div className="flex items-start">
                  <div className="mr-3 bg-blue-500/10 p-2 rounded-full">
                    <Truck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Commande expédiée</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      La commande a été expédiée et est en cours de livraison.
                    </p>
                  </div>
                </div>
              )}
              
              {order.status === 'DELIVERED' && (
                <div className="flex items-start">
                  <div className="mr-3 bg-green-500/10 p-2 rounded-full">
                    <Package className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Commande livrée</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      La commande a été livrée au client avec succès.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar avec informations client et notes */}
        <div className="space-y-6">
          {/* Informations client */}
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-foreground/10 flex justify-between items-center">
              <h2 className="font-semibold">Informations client</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleContactClient}
              >
                <Mail className="h-4 w-4 mr-1" />
                Contacter
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-start mb-4">
                <div className="bg-foreground/10 h-10 w-10 rounded-full flex items-center justify-center mr-3">
                  <User className="h-5 w-5 text-foreground/60" />
                </div>
                <div>
                  <div className="font-medium">{order.user.name}</div>
                  <div className="text-sm text-muted-foreground">{order.user.email}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{order.user.email}</span>
                </div>
                {order.user.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{order.user.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Client depuis {format(new Date(order.user.createdAt), 'MMMM yyyy', { locale: fr })}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Informations de paiement */}
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-foreground/10">
              <h2 className="font-semibold">Paiement</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Méthode</span>
                  </div>
                  <span className="font-medium">Facture</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Statut</span>
                  </div>
                  <Badge variant={
                    order.status === 'INVOICE_PAID' ? 'success' : 
                    order.status === 'INVOICE_OVERDUE' ? 'destructive' : 
                    'warning'
                  }>
                    {order.status === 'INVOICE_PAID' ? 'Payée' : 
                     order.status === 'INVOICE_OVERDUE' ? 'En retard' : 
                     'En attente'}
                  </Badge>
                </div>
                {order.invoice && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <ReceiptText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Facture #</span>
                      </div>
                      <span className="font-medium">{order.invoice.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Échéance</span>
                      </div>
                      <span className="font-medium">
                        {format(new Date(order.invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {order.invoice && (
                <div className="mt-4 bg-foreground/5 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Détails de la facture</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Numéro:</span>
                      <span className="font-medium">{order.invoice.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{format(new Date(order.invoice.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Montant:</span>
                      <span className="font-medium">{formatNumber(order.invoice.amount)} CHF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Échéance:</span>
                      <span>{format(new Date(order.invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Notes d'administration */}
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-foreground/10">
              <h2 className="font-semibold">Notes d'administration</h2>
            </div>
            <div className="p-4">
              <textarea
                className="w-full border border-foreground/10 rounded-md p-3 text-sm resize-none h-32"
                placeholder="Ajouter des notes concernant cette commande (visibles uniquement par les administrateurs)"
              ></textarea>
              <div className="mt-2 flex justify-end">
                <Button size="sm">
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}