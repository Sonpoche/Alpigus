// app/(protected)/invoices/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
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
  Ban
} from 'lucide-react'
import { formatDateToFrench } from '@/lib/date-utils'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [processingInvoiceId, setProcessingInvoiceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('dueDate_asc')

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

  // Payer une facture
  const payInvoice = async (invoiceId: string) => {
    try {
      setProcessingInvoiceId(invoiceId)
      setIsProcessingPayment(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod: 'card'
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du paiement de la facture')
      }
      
      const updatedInvoice = await response.json()
      
      // Mettre à jour la liste des factures
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === invoiceId ? updatedInvoice : invoice
        )
      )
      
      toast({
        title: 'Paiement réussi',
        description: 'Votre facture a été payée avec succès',
        variant: 'default'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur de paiement',
        description: 'Impossible de traiter votre paiement',
        variant: 'destructive'
      })
    } finally {
      setIsProcessingPayment(false)
      setProcessingInvoiceId(null)
    }
  }

  // Télécharger une facture
  const downloadInvoice = async (invoiceId: string) => {
    try {
      // Dans une implémentation réelle, cette fonction déclencherait 
      // un téléchargement de fichier PDF
      toast({
        title: 'Téléchargement',
        description: 'Le téléchargement de la facture va commencer',
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
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">En attente</Badge>
      case 'PAID':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Payée</Badge>
      case 'OVERDUE':
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">En retard</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Annulée</Badge>
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Mes factures</h1>
      <p className="text-muted-foreground mb-6">
        Consultez et gérez toutes vos factures
      </p>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-foreground/10 rounded-md w-full"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-foreground/10 rounded-md px-3 py-2 bg-background"
          >
            <option value="all">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="PAID">Payées</option>
            <option value="OVERDUE">En retard</option>
            <option value="CANCELLED">Annulées</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-foreground/10 rounded-md px-3 py-2 bg-background"
          >
            <option value="dueDate_asc">Échéance (croissante)</option>
            <option value="dueDate_desc">Échéance (décroissante)</option>
            <option value="amount_asc">Montant (croissant)</option>
            <option value="amount_desc">Montant (décroissant)</option>
            <option value="date_desc">Date (récente d'abord)</option>
            <option value="date_asc">Date (ancienne d'abord)</option>
          </select>
        </div>
      </div>

      {/* Liste des factures */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-foreground/5 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-medium mb-2">Aucune facture trouvée</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? "Aucune facture ne correspond à vos critères de recherche"
              : "Vous n'avez pas encore de factures"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map(invoice => (
            <div 
              key={invoice.id} 
              className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                      {getStatusIcon(invoice.status)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Facture #{invoice.id.substring(0, 8).toUpperCase()}</h3>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Commande #{invoice.orderId.substring(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <p className="font-bold text-lg">{invoice.amount.toFixed(2)} CHF</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {invoice.status === 'PENDING' ? (
                        <span>
                          À régler avant le {formatDateToFrench(new Date(invoice.dueDate))}
                          {isOverdue(invoice.dueDate) && (
                            <span className="text-red-500 ml-1">En retard</span>
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
                  <div className="mt-4 mb-4">
                    <p className="text-sm font-medium mb-1">Résumé de la commande :</p>
                    <div className="text-sm text-muted-foreground">
                      {invoice.order.items.slice(0, 2).map((item, index) => (
                        <span key={index} className="mr-2">
                          {item.quantity} {item.product.unit} de {item.product.name}
                          {index < Math.min(1, invoice.order.items.length - 1) ? ',' : ''}
                        </span>
                      ))}
                      {invoice.order.items.length > 2 && (
                        <span>et {invoice.order.items.length - 2} autres articles</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => downloadInvoice(invoice.id)}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger
                  </button>
                  
                  <Link
                    href={`/orders?modal=${invoice.orderId}`}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                  >
                    Voir la commande
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  
                  {invoice.status === 'PENDING' && (
                    <LoadingButton
                      onClick={() => payInvoice(invoice.id)}
                      isLoading={isProcessingPayment && processingInvoiceId === invoice.id}
                      size="sm"
                      icon={<CreditCard className="h-4 w-4" />}
                      className="bg-custom-accent text-white hover:bg-custom-accent/90"
                    >
                      Payer maintenant
                    </LoadingButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}