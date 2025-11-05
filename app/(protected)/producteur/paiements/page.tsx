// app/(protected)/producer/payments/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  DollarSign,
  CreditCard,
  ExternalLink,
  Calendar,
  PiggyBank,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Download,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatPrice } from '@/lib/number-utils'

interface Transaction {
  id: string
  orderId: string
  amount: number
  fee: number
  currency: string
  status: string
  createdAt: string
  updatedAt: string
  stripePaymentIntentId: string
  stripeTransferId: string | null
  metadata: string
}

export default function ProducerPaymentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingDashboardLink, setIsCreatingDashboardLink] = useState(false)
  const [producerData, setProducerData] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionStats, setTransactionStats] = useState({
    totalRevenue: 0,
    totalFees: 0,
    netRevenue: 0,
    pendingAmount: 0,
    successfulAmount: 0,
    failedAmount: 0,
    transactionCount: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Récupérer le profil producteur et les transactions
      const [producerResponse, transactionsResponse] = await Promise.all([
        fetch('/api/users/producer-profile'),
        fetch(`/api/transactions/producer?range=${timeRange}`)
      ])
      
      if (!producerResponse.ok || !transactionsResponse.ok) {
        throw new Error('Erreur lors du chargement des données')
      }
      
      const producerData = await producerResponse.json()
      const transactionsData = await transactionsResponse.json()
      
      setProducerData(producerData)
      setTransactions(transactionsData.transactions)
      
      // Calculer les statistiques
      const stats = calculateStats(transactionsData.transactions)
      setTransactionStats(stats)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de paiement",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (transactions: Transaction[]) => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
    const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0)
    const netRevenue = totalRevenue - totalFees
    
    const pendingAmount = transactions
      .filter(t => t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const successfulAmount = transactions
      .filter(t => t.status === 'SUCCEEDED')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const failedAmount = transactions
      .filter(t => t.status === 'FAILED')
      .reduce((sum, t) => sum + t.amount, 0)
    
    return {
      totalRevenue,
      totalFees,
      netRevenue,
      pendingAmount,
      successfulAmount,
      failedAmount,
      transactionCount: transactions.length
    }
  }

  const handleGoToDashboard = async () => {
    try {
      setIsCreatingDashboardLink(true)
      const response = await fetch('/api/payment/dashboard-link')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création du lien de dashboard')
      }
      
      const data = await response.json()
      
      // Ouvrir le dashboard Stripe dans un nouvel onglet
      window.open(data.url, '_blank')
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au dashboard Stripe",
        variant: "destructive"
      })
    } finally {
      setIsCreatingDashboardLink(false)
    }
  }

  // Filtrer les transactions selon la recherche
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    const orderId = transaction.orderId.toLowerCase()
    
    // Chercher dans l'ID de commande ou le statut
    return orderId.includes(searchLower) || transaction.status.toLowerCase().includes(searchLower)
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  // Vérifier si le compte Stripe est configuré
  const isStripeConfigured = producerData?.stripeAccountId && producerData?.stripeAccountStatus === 'ACTIVE'

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes paiements</h1>
        <p className="text-muted-foreground">
          Suivez vos revenus et gérez vos paiements
        </p>
      </div>
      
      {/* Alerte si compte Stripe non configuré */}
      {!isStripeConfigured && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                Configuration des paiements requise
              </h3>
              <p className="text-yellow-700 dark:text-yellow-400 mb-4">
                Pour recevoir les paiements de vos ventes, vous devez configurer votre compte Stripe.
              </p>
              <Link 
                href="/producer/settings/stripe" 
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors inline-flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Configurer mes paiements
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Statistiques des paiements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenu total</p>
              <p className="text-2xl font-semibold text-custom-title">{formatPrice(transactionStats.totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <PiggyBank className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenu net</p>
              <p className="text-2xl font-semibold text-custom-title">{formatPrice(transactionStats.netRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commission totale</p>
              <p className="text-2xl font-semibold text-custom-title">{formatPrice(transactionStats.totalFees)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-custom-accent/10 rounded-full">
              <CreditCard className="h-6 w-6 text-custom-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre de transactions</p>
              <p className="text-2xl font-semibold text-custom-title">{transactionStats.transactionCount}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* En-tête de tableau avec filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Historique des transactions</h2>
          
          {/* Sélecteur de période */}
          <div className="flex items-center gap-2 bg-foreground/5 p-1 rounded-lg">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'week' ? 'bg-custom-accent text-white' : 'hover:bg-foreground/10'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'month' ? 'bg-custom-accent text-white' : 'hover:bg-foreground/10'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'year' ? 'bg-custom-accent text-white' : 'hover:bg-foreground/10'
              }`}
            >
              Année
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 md:flex-initial">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 w-full md:w-60 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm"
            />
          </div>
          
          {/* Lien vers Stripe Dashboard si configuré */}
          {isStripeConfigured && (
            <LoadingButton
              onClick={handleGoToDashboard}
              isLoading={isCreatingDashboardLink}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Dashboard Stripe
            </LoadingButton>
          )}
        </div>
      </div>
      
      {/* Tableau des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <DollarSign className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Aucune transaction trouvée</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? "Aucune transaction ne correspond à votre recherche."
              : "Vous n'avez pas encore de transactions pour cette période."}
          </p>
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/5">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Net
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  // Calculer le montant net
                  const netAmount = transaction.amount - transaction.fee
                  
                  // Formater la date
                  const transactionDate = new Date(transaction.createdAt)
                  const formattedDate = format(transactionDate, 'PPP', { locale: fr })
                  
                  // Déterminer le style du statut
                  let statusStyle = ""
                  let statusText = ""
                  
                  switch (transaction.status) {
                    case 'SUCCEEDED':
                      statusStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      statusText = "Payé"
                      break
                    case 'PENDING':
                      statusStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                      statusText = "En attente"
                      break
                    case 'FAILED':
                      statusStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      statusText = "Échoué"
                      break
                    default:
                      statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                      statusText = transaction.status
                  }
                  
                  return (
                    <tr key={transaction.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <Link 
                          href={`/producer/orders?modal=${transaction.orderId}`}
                          className="text-custom-accent hover:underline"
                        >
                          #{transaction.orderId.substring(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap font-medium">
                        {formatPrice(transaction.amount)}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap text-muted-foreground">
                        -{formatPrice(transaction.fee)}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap font-medium">
                        {formatPrice(netAmount)}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}