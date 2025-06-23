// app/(protected)/invoices/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useInvoiceContext } from '@/contexts/invoice-context'
import { 
  CreditCard, 
  FileText, 
  Clock, 
  CheckCircle, 
  Download, 
  AlertCircle,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  Ban,
  ChevronDown,
  Package,
  Eye,
  DollarSign,
  Building2,
  Receipt
} from 'lucide-react'
import { formatDateToFrench } from '@/lib/date-utils'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form'
import { BankTransferForm } from '@/components/checkout/bank-transfer-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'

// Types pour les factures
interface Invoice {
  id: string
  orderId: string
  amount: number
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: string
  createdAt: string
  paidAt?: string
  paymentMethod?: string
  order: {
    items: {
      quantity: number
      product: {
        name: string
        unit: string
      }
    }[]
  }
}

export default function InvoicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { refreshPendingCount } = useInvoiceContext()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [processingInvoiceId, setProcessingInvoiceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('dueDate_asc')
  
  // États pour la modal de paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('card')

  // Vérifier l'état de l'authentification
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchInvoices()
    }
  }, [status, router])

  // Récupérer les factures
  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invoices')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des factures')
      }
      
      const data = await response.json()
      setInvoices(data.invoices || [])
      setFilteredInvoices(data.invoices || [])
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos factures',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrer les factures
  useEffect(() => {
    let result = [...invoices]
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter)
    }
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(invoice => 
        invoice.id.toLowerCase().includes(query) || 
        invoice.orderId.toLowerCase().includes(query)
      )
    }
    
    // Tri
    result.sort((a, b) => {
      const [field, direction] = sortBy.split('_')
      
      if (field === 'amount') {
        return direction === 'asc' ? a.amount - b.amount : b.amount - a.amount
      } else if (field === 'dueDate') {
        return direction === 'asc' 
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      } else { // date
        return direction === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    
    setFilteredInvoices(result)
  }, [invoices, searchQuery, statusFilter, sortBy])

  // Ouvrir la modal de paiement
  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPaymentModal(true)
  }

  // Fermer la modal de paiement
  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedInvoice(null)
    setPaymentMethod('card')
  }

  // Gestion du paiement par carte Stripe - SUCCESS
  const handleStripePaymentSuccess = async (paymentIntent: any) => {
    if (!selectedInvoice) return
    
    try {
      // Finaliser le paiement côté serveur avec l'ID du PaymentIntent
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod: 'card',
          stripePaymentIntentId: paymentIntent.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la confirmation du paiement')
      }
      
      const updatedInvoice = await response.json()
      
      // Mettre à jour la liste des factures
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === selectedInvoice.id ? updatedInvoice : invoice
        )
      )
      
      toast({
        title: 'Paiement réussi',
        description: 'Votre facture a été payée avec succès',
        variant: 'default'
      })
      
      // Rafraîchir le compteur de factures en attente
      refreshPendingCount()
      
      closePaymentModal()
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la finalisation du paiement',
        variant: 'destructive'
      })
    }
  }

  // Gestion du paiement par carte Stripe - ERROR
  const handleStripePaymentError = (error: string) => {
    toast({
      title: 'Erreur de paiement',
      description: error,
      variant: 'destructive'
    })
  }

  // Gestion du virement bancaire
  const handleBankTransferConfirm = async () => {
    if (!selectedInvoice) return
    
    try {
      setIsProcessingPayment(true)
      
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod: 'bank_transfer'
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la confirmation du virement')
      }
      
      const updatedInvoice = await response.json()
      
      // Mettre à jour la liste des factures
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === selectedInvoice.id ? updatedInvoice : invoice
        )
      )
      
      toast({
        title: 'Virement confirmé',
        description: 'Nous traiterons votre virement dans les plus brefs délais',
        variant: 'default'
      })
      
      // Rafraîchir le compteur de factures en attente
      refreshPendingCount()
      
      closePaymentModal()
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de confirmer le virement',
        variant: 'destructive'
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Télécharger une facture
  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la facture')
      }
      
      // Ouvrir la facture HTML dans un nouvel onglet
      const html = await response.text()
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(html)
        newWindow.document.close()
      }
      
      toast({
        title: 'Facture générée',
        description: 'Votre facture s\'ouvre dans un nouvel onglet',
        variant: 'default'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger la facture',
        variant: 'destructive'
      })
    }
  }

  // Obtenir la couleur du badge selon le statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        )
      case 'PAID':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Payée
          </Badge>
        )
      case 'OVERDUE':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            En retard
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
            <Ban className="h-3 w-3 mr-1" />
            Annulée
          </Badge>
        )
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-amber-500" />
      case 'PAID':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'OVERDUE':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'CANCELLED':
        return <Ban className="h-5 w-5 text-gray-500" />
      default:
        return <FileText className="h-5 w-5 text-blue-500" />
    }
  }

  // Calculer si une facture est en retard
  const isOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return due < today
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* En-tête responsive */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Mes factures</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Consultez et gérez toutes vos factures
        </p>
      </div>

      {/* Filtres et recherche responsive */}
      <div className="space-y-4 mb-6">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par numéro de facture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-foreground/10 rounded-lg text-sm"
          />
        </div>
        
        {/* Filtres en ligne sur desktop, empilés sur mobile */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtre par statut */}
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none border border-foreground/10 rounded-md px-3 py-2 pr-8 text-sm bg-background [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ backgroundImage: 'none' }}
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="PAID">Payées</option>
              <option value="OVERDUE">En retard</option>
              <option value="CANCELLED">Annulées</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          
          {/* Tri */}
          <div className="relative flex-1 sm:flex-none sm:w-52">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none border border-foreground/10 rounded-md px-3 py-2 pr-8 text-sm bg-background [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ backgroundImage: 'none' }}
            >
              <option value="dueDate_asc">Échéance (croissante)</option>
              <option value="dueDate_desc">Échéance (décroissante)</option>
              <option value="amount_asc">Montant (croissant)</option>
              <option value="amount_desc">Montant (décroissant)</option>
              <option value="date_desc">Date (récente d'abord)</option>
              <option value="date_asc">Date (ancienne d'abord)</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          
          {/* Bouton reset */}
          <button
            onClick={() => {
              setStatusFilter('all')
              setSearchQuery('')
              setSortBy('dueDate_asc')
            }}
            className="px-3 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="sm:hidden">Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Liste des factures */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 sm:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Aucune facture trouvée</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? "Aucune facture ne correspond à vos critères de recherche"
              : "Vous n'avez pas encore de factures. Elles apparaîtront ici après vos commandes."}
          </p>
        </div>
      ) : (
        <>
          {/* Version mobile - Cards */}
          <div className="lg:hidden space-y-4">
            {filteredInvoices.map(invoice => (
              <div 
                key={invoice.id} 
                className="bg-background border border-foreground/10 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* En-tête de la card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(invoice.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate">
                        Facture #{invoice.id.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        Commande #{invoice.orderId.substring(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                
                {/* Montant et dates */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">{invoice.amount.toFixed(2)} CHF</p>
                      <p className="text-xs text-muted-foreground">Montant</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">
                        {invoice.status === 'PAID' && invoice.paidAt
                          ? formatDateToFrench(new Date(invoice.paidAt))
                          : formatDateToFrench(new Date(invoice.dueDate))
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.status === 'PAID' ? 'Payée le' : 'Échéance'}
                        {invoice.status === 'PENDING' && isOverdue(invoice.dueDate) && (
                          <span className="text-red-500 ml-1">En retard</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Résumé commande */}
                {invoice.order?.items && invoice.order.items.length > 0 && (
                  <div className="mb-3 p-2 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs font-medium">Résumé :</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.order.items.slice(0, 2).map((item, index) => (
                        <span key={index} className="mr-2">
                          {item.quantity} {item.product.unit} de {item.product.name}
                          {index < Math.min(1, invoice.order.items.length - 1) ? ',' : ''}
                        </span>
                      ))}
                      {invoice.order.items.length > 2 && (
                        <span>et {invoice.order.items.length - 2} autres</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-foreground/10">
                  <button
                    onClick={() => downloadInvoice(invoice.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                  
                  <Link
                    href={`/orders?modal=${invoice.orderId}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    Commande
                  </Link>
                  
                  {invoice.status === 'PENDING' && (
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="flex-1 bg-custom-accent text-white hover:bg-custom-accent/90 transition-colors flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm"
                    >
                      <CreditCard className="h-4 w-4" />
                      Payer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Version desktop - Cards améliorées */}
          <div className="hidden lg:block space-y-4">
            {filteredInvoices.map(invoice => (
              <div 
                key={invoice.id} 
                className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                        {getStatusIcon(invoice.status)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-lg">Facture #{invoice.id.substring(0, 8).toUpperCase()}</h3>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Commande #{invoice.orderId.substring(0, 8).toUpperCase()} • {formatDateToFrench(new Date(invoice.createdAt))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-xl">{invoice.amount.toFixed(2)} CHF</p>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {invoice.status === 'PENDING' ? (
                          <span>
                            À régler avant le {formatDateToFrench(new Date(invoice.dueDate))}
                            {isOverdue(invoice.dueDate) && (
                              <span className="text-red-500 ml-1 font-medium">En retard</span>
                            )}
                          </span>
                        ) : invoice.status === 'PAID' ? (
                          <span>Payée le {formatDateToFrench(new Date(invoice.paidAt || ''))}</span>
                        ) : (
                          <span>Échéance: {formatDateToFrench(new Date(invoice.dueDate))}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Résumé des articles de la commande */}
                  {invoice.order?.items && invoice.order.items.length > 0 && (
                    <div className="mt-4 mb-4 p-3 bg-muted/30 rounded-md">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Résumé de la commande :
                      </p>
                      <div className="text-sm text-muted-foreground">
                        {invoice.order.items.slice(0, 3).map((item, index) => (
                          <span key={index} className="mr-3">
                            {item.quantity} {item.product.unit} de {item.product.name}
                            {index < Math.min(2, invoice.order.items.length - 1) ? ',' : ''}
                          </span>
                        ))}
                        {invoice.order.items.length > 3 && (
                          <span>et {invoice.order.items.length - 3} autres articles</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => downloadInvoice(invoice.id)}
                      className="flex items-center gap-2 px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger PDF
                    </button>
                    
                    <Link
                      href={`/orders?modal=${invoice.orderId}`}
                      className="flex items-center gap-2 px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Voir la commande
                    </Link>
                    
                    {invoice.status === 'PENDING' && (
                      <button
                        onClick={() => openPaymentModal(invoice)}
                        className="bg-custom-accent text-white hover:bg-custom-accent/90 flex items-center gap-2 px-4 py-2 rounded-md transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        Payer maintenant
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de paiement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payer la facture #{selectedInvoice?.id.substring(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Résumé facture */}
              <div className="bg-foreground/5 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Montant à payer:</span>
                  <span className="text-lg font-bold">{selectedInvoice.amount.toFixed(2)} CHF</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Échéance:</span>
                  <span>{formatDateToFrench(new Date(selectedInvoice.dueDate))}</span>
                </div>
              </div>
              
              {/* Sélection méthode de paiement */}
              <div className="space-y-4">
                <h4 className="font-medium">Choisir une méthode de paiement</h4>
                
                <div className="space-y-3">
                  {/* Paiement par carte */}
                  <div className="flex items-start space-x-3">
                    <input
                      id="card"
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                    />
                    <div className="flex-1">
                      <label htmlFor="card" className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Paiement par carte
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Paiement immédiat et sécurisé par Stripe
                      </p>
                    </div>
                  </div>
                  
                  {/* Virement bancaire */}
                  <div className="flex items-start space-x-3">
                    <input
                      id="bank_transfer"
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="mt-1 h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                    />
                    <div className="flex-1">
                      <label htmlFor="bank_transfer" className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Virement bancaire
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Paiement par virement avec instructions détaillées
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Interface de paiement selon la méthode choisie */}
              {paymentMethod === 'card' && (
                <div className="border border-foreground/10 rounded-lg p-4">
                  <StripePaymentForm
                    amount={selectedInvoice.amount}
                    orderId={selectedInvoice.orderId}
                    onSuccess={handleStripePaymentSuccess}
                    onError={handleStripePaymentError}
                    type="invoice"
                    invoiceId={selectedInvoice.id}
                  />
                </div>
              )}
              
              {paymentMethod === 'bank_transfer' && (
                <div className="border border-foreground/10 rounded-lg p-4">
                  <BankTransferForm
                    amount={selectedInvoice.amount}
                    orderId={selectedInvoice.orderId} // Utiliser l'ID de la commande pour la référence
                    onConfirm={handleBankTransferConfirm}
                    isLoading={isProcessingPayment}
                  />
                </div>
              )}
              
              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4 border-t border-foreground/10">
                <button
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                >
                  Annuler
                </button>
                
                {paymentMethod === 'bank_transfer' && (
                  <LoadingButton
                    onClick={handleBankTransferConfirm}
                    isLoading={isProcessingPayment}
                    className="flex-1 bg-custom-accent text-white hover:bg-custom-accent/90"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Confirmer le virement
                  </LoadingButton>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}