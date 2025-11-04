// Chemin du fichier: app/(protected)/admin/commandes/[id]/page.tsx
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
    CheckCircle,
    Bell,
    Save
  } from 'lucide-react' 
import { LoadingButton } from '@/components/ui/loading-button'
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
  const [adminNote, setAdminNote] = useState('')
  const [noteHistory, setNoteHistory] = useState([])
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailModalData, setEmailModalData] = useState({
    recipientEmail: '',
    recipientName: '',
    defaultSubject: '',
    defaultMessage: '',
    type: 'client' as 'client' | 'producer'
  })

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
      setNoteHistory(data.adminNotesHistory || [])
      
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

  const handleContactClient = () => {
    if (!order?.user?.email) {
      toast({
        title: "Erreur",
        description: "Email du client non disponible",
        variant: "destructive"
      })
      return
    }

    const subject = `Concernant votre commande #${order.id.substring(0, 8)}`
    const defaultMessage = `Bonjour ${order.user.name || 'Client'},

Concernant votre commande #${order.id.substring(0, 8)} du ${new Date(order.createdAt).toLocaleDateString('fr-FR')}...

Cordialement,
L'équipe Mushroom Marketplace`

    window.location.href = `mailto:${order.user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(defaultMessage)}`
  }

  const handleContactProducer = (producerId: string) => {
    const producer = Object.values(itemsByProducer).flat()
      .find((item: any) => item.product.producer.id === producerId)?.product.producer

    if (!producer?.user?.email) {
      toast({
        title: "Erreur",
        description: "Email du producteur non disponible",
        variant: "destructive"
      })
      return
    }

    const subject = `Concernant la commande #${order.id.substring(0, 8)}`
    const defaultMessage = `Bonjour ${producer.user.name || 'Producteur'},

Concernant la commande #${order.id.substring(0, 8)} du ${new Date(order.createdAt).toLocaleDateString('fr-FR')}...

Cordialement,
L'équipe Mushroom Marketplace`

    window.location.href = `mailto:${producer.user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(defaultMessage)}`
  }

  const handleSendReminder = async () => {
    try {
      setIsSendingNotification(true)
      
      const response = await fetch(`/api/admin/orders/${params.id}/send-reminder`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du rappel')
      }
      
      toast({
        title: "Rappel envoyé",
        description: "Une notification push a été envoyée au(x) producteur(s) concerné(s)",
        duration: 5000
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

  const handleSaveAdminNote = async () => {
    if (!adminNote.trim()) {
      toast({
        title: "Attention",
        description: "Veuillez saisir une note avant de sauvegarder",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSavingNote(true)
      
      const response = await fetch(`/api/admin/orders/${params.id}/admin-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: adminNote })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }
      
      await fetchOrder()
      setAdminNote('')
      
      toast({
        title: "Note sauvegardée",
        description: "La note d'administration a été ajoutée avec succès"
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la note",
        variant: "destructive"
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'PENDING': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-800' },
      'CONFIRMED': { label: 'Confirmée', className: 'bg-blue-100 text-blue-800 border-2 border-blue-800' },
      'SHIPPED': { label: 'Expédiée', className: 'bg-purple-100 text-purple-800 border-2 border-purple-800' },
      'DELIVERED': { label: 'Livrée', className: 'bg-green-100 text-green-800 border-2 border-green-800' },
      'CANCELLED': { label: 'Annulée', className: 'bg-red-100 text-red-800 border-2 border-red-800' },
      'INVOICE_PENDING': { label: 'Facture en attente', className: 'bg-orange-100 text-orange-800 border-2 border-orange-800' },
      'INVOICE_PAID': { label: 'Facture payée', className: 'bg-green-100 text-green-800 border-2 border-green-800' },
      'INVOICE_OVERDUE': { label: 'Facture en retard', className: 'bg-red-100 text-red-800 border-2 border-red-800' }
    }
    
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-2 border-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Commande introuvable</h3>
        <p className="text-gray-600 mb-4">La commande demandée n'a pas été trouvée</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2 bg-black text-white border-2 border-black rounded-md hover:bg-gray-800 transition-colors font-semibold"
        >
          Retour
        </button>
      </div>
    )
  }

  const itemsByProducer: Record<string, any[]> = {}
  order.items.forEach((item: any) => {
    const producerId = item.product.producer.id
    if (!itemsByProducer[producerId]) {
      itemsByProducer[producerId] = []
    }
    itemsByProducer[producerId].push(item)
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders/supervision"
            className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Commande #{order.id.substring(0, 8)}</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(order.createdAt), 'PPPP', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(order.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Détails de la commande */}
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-lg">Détails de la commande</h2>
              <LoadingButton
                onClick={handleSendReminder}
                isLoading={isSendingNotification}
                className="bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2 rounded-md font-semibold flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Envoyer un rappel
              </LoadingButton>
            </div>
            
            {Object.entries(itemsByProducer).map(([producerId, items]) => {
              const producer = items[0].product.producer
              
              return (
                <div key={producerId} className="border-b-2 border-gray-200 last:border-b-0">
                  <div className="p-4 bg-gray-50 flex justify-between items-center border-b-2 border-gray-200">
                    <div>
                      <div className="font-bold text-black">{producer.companyName || producer.user.name}</div>
                      <div className="text-sm text-gray-600">{producer.user.email}</div>
                    </div>
                    <button 
                      onClick={() => handleContactProducer(producerId)}
                      className="px-4 py-2 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Contacter
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-bold">Produit</th>
                          <th className="px-4 py-3 text-center text-sm font-bold">Quantité</th>
                          <th className="px-4 py-3 text-right text-sm font-bold">Prix unitaire</th>
                          <th className="px-4 py-3 text-right text-sm font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any) => (
                          <tr key={item.id} className="border-b border-gray-200 last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                {item.product.image ? (
                                  <div className="h-12 w-12 rounded-md overflow-hidden mr-3 border-2 border-gray-200">
                                    <img 
                                      src={item.product.image} 
                                      alt={item.product.name} 
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-12 w-12 rounded-md overflow-hidden mr-3 bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-black">{item.product.name}</div>
                                  <div className="text-sm text-gray-600">{item.product.type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium">
                              {formatNumber(item.quantity)} {item.product.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatNumber(item.price)} CHF
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatNumber(item.price * item.quantity)} CHF
                            </td>
                          </tr>
                        ))}
                        
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-4 py-3 text-right font-bold">
                            Sous-total ({items.length} article{items.length > 1 ? 's' : ''})
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatNumber(items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0))} CHF
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            
            <div className="p-6 border-t-2 border-black bg-gray-50">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{formatNumber(order.total)} CHF</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Livraison</span>
                    <span className="font-medium">{formatNumber(0)} CHF</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl">{formatNumber(order.total)} CHF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline de la commande */}
          <div className="bg-white border-2 border-black rounded-lg p-6">
            <h2 className="font-bold text-lg mb-6">Suivi de la commande</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="mr-4 bg-blue-100 p-3 rounded-full border-2 border-blue-500">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-bold text-black">Commande reçue</span>
                    <span className="text-sm text-gray-600 ml-3">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    La commande a été passée par le client et est en attente de traitement.
                  </p>
                </div>
              </div>
              
              {order.status !== 'PENDING' && (
                <div className="flex items-start">
                  <div className="mr-4 bg-green-100 p-3 rounded-full border-2 border-green-500">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-bold text-black">Commande confirmée</span>
                      <span className="text-sm text-gray-600 ml-3">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      La commande a été confirmée par le(s) producteur(s).
                    </p>
                  </div>
                </div>
              )}
              
              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <div className="flex items-start">
                  <div className="mr-4 bg-purple-100 p-3 rounded-full border-2 border-purple-500">
                    <Truck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-bold text-black">Commande expédiée</span>
                      <span className="text-sm text-gray-600 ml-3">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      La commande a été expédiée et est en cours de livraison.
                    </p>
                  </div>
                </div>
              )}
              
              {order.status === 'DELIVERED' && (
                <div className="flex items-start">
                  <div className="mr-4 bg-green-100 p-3 rounded-full border-2 border-green-500">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-bold text-black">Commande livrée</span>
                      <span className="text-sm text-gray-600 ml-3">
                        {format(new Date(order.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      La commande a été livrée au client avec succès.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informations client */}
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold">Informations client</h2>
              <button 
                onClick={handleContactClient}
                className="px-3 py-1 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold text-sm flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Contacter
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start mb-4">
                <div className="bg-gray-100 h-12 w-12 rounded-full flex items-center justify-center mr-3 border-2 border-gray-300">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <div className="font-bold text-black">{order.user.name}</div>
                  <div className="text-sm text-gray-600">{order.user.email}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-700">{order.user.email}</span>
                </div>
                {order.user.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-700">{order.user.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-700">Client depuis {format(new Date(order.user.createdAt), 'MMMM yyyy', { locale: fr })}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Informations de paiement */}
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-50">
              <h2 className="font-bold">Paiement</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-700">Méthode</span>
                  </div>
                  <span className="font-semibold">
                    {order.paymentInfo?.paymentMethod === 'card' ? 'Carte bancaire' :
                    order.paymentInfo?.paymentMethod === 'bank_transfer' ? 'Virement bancaire' :
                    order.invoice?.paymentMethod === 'card' ? 'Carte bancaire' :
                    order.invoice?.paymentMethod === 'bank_transfer' ? 'Virement bancaire' :
                    'Facture'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-700">Statut</span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {order.status === 'INVOICE_PAID' && (order.paymentInfo?.paidAt || order.invoice?.paidAt) && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-gray-700">Payée le</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {format(
                        new Date(order.paymentInfo?.paidAt || order.invoice?.paidAt), 
                        'dd/MM/yyyy à HH:mm', 
                        { locale: fr }
                      )}
                    </span>
                  </div>
                )}

                {order.invoice && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <ReceiptText className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-700">Montant</span>
                      </div>
                      <span className="font-semibold">{order.invoice.amount.toFixed(2)} CHF</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <ReceiptText className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-700">Facture #</span>
                      </div>
                      <span className="font-semibold">{order.invoice.id.substring(0, 8)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-700">Échéance</span>
                      </div>
                      <span className={cn(
                        "font-semibold",
                        order.status === 'INVOICE_OVERDUE' && "text-red-600",
                        order.status === 'INVOICE_PAID' && "text-green-600"
                      )}>
                        {format(new Date(order.invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}
                        {order.status === 'INVOICE_OVERDUE' && " (dépassée)"}
                        {order.status === 'INVOICE_PAID' && " (respectée)"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {order.invoice && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md border-2 border-gray-200">
                  <h4 className="text-sm font-bold mb-3">Détails de la facture</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Numéro:</span>
                      <span className="font-semibold">INV-{order.invoice.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Créée le:</span>
                      <span className="font-semibold">{format(new Date(order.invoice.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className="font-semibold">{order.invoice.status}</span>
                    </div>
                    
                    {order.status === 'INVOICE_PAID' && order.invoice.paidAt && (
                      <>
                        <hr className="my-2 border-gray-300" />
                        <div className="flex justify-between text-green-600">
                          <span className="font-semibold">Paiement confirmé:</span>
                          <span className="font-semibold">
                            {format(new Date(order.invoice.paidAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        </div>
                        {order.invoice.paymentMethod && (
                          <div className="flex justify-between text-green-600">
                            <span className="font-semibold">Via:</span>
                            <span className="font-semibold">
                              {order.invoice.paymentMethod === 'card' ? 'Carte bancaire' :
                              order.invoice.paymentMethod === 'bank_transfer' ? 'Virement bancaire' :
                              order.invoice.paymentMethod}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                )}
            </div>
          </div>
          
          {/* Notes d'administration */}
          <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-50">
              <h2 className="font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes d'administration
              </h2>
            </div>
            <div className="p-4 space-y-4">
              
              {/* Historique des notes */}
              {noteHistory.length > 0 && (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-bold text-gray-700">Historique:</h4>
                  {noteHistory.map((note: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md border-2 border-gray-200">
                      <p className="text-sm text-black">{note.content}</p>
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span className="font-semibold">{note.adminName}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nouvelle note */}
              <div className="space-y-3">
                <label htmlFor="adminNote" className="block text-sm font-bold text-black">
                  Ajouter une note:
                </label>
                <textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Note interne pour l'équipe admin..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
                />
                <LoadingButton
                  onClick={handleSaveAdminNote}
                  isLoading={isSavingNote}
                  disabled={!adminNote.trim()}
                  className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}