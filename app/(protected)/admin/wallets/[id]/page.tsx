// app/(protected)/admin/wallets/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Wallet, 
  Building, 
  Mail, 
  Phone, 
  Landmark,
  Clock,
  CheckCircle,
  XCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { LoadingButton } from '@/components/ui/loading-button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatPrice } from '@/lib/number-utils'

interface PageProps {
  params: {
    id: string
  }
}

interface WithdrawalData {
  id: string
  amount: number
  status: string
  bankDetails: string
  reference: string | null
  processorNote: string | null
  requestedAt: string
  processedAt: string | null
}

interface TransactionData {
  id: string
  amount: number
  status: string
  type: string
  description: string | null
  createdAt: string
}

interface WalletDetail {
  id: string
  balance: number
  pendingBalance: number
  totalEarned: number
  totalWithdrawn: number
  producer: {
    id: string
    userId: string
    companyName: string
    address: string | null
    bankName: string | null
    bankAccountName: string | null
    iban: string | null
    bic: string | null
    user: {
      id: string
      name: string | null
      email: string
      phone: string | null
    }
  }
  withdrawals: WithdrawalData[]
  transactions: TransactionData[]
}

export default function WalletDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [walletData, setWalletData] = useState<WalletDetail | null>(null)
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false)
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null)
  const [withdrawalNote, setWithdrawalNote] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')

  useEffect(() => {
    if (params.id) {
      fetchWalletData(params.id)
    }
  }, [params.id])

  const fetchWalletData = async (walletId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/wallets/${walletId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/wallets')
          return
        }
        throw new Error('Erreur lors du chargement des données du portefeuille')
      }
      
      const data = await response.json()
      setWalletData(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du portefeuille',
        variant: 'destructive'
      })
      router.push('/admin/wallets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdrawalAction = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawalId) return
    
    try {
      setIsProcessingWithdrawal(true)
      
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawalId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'COMPLETED' : 'REJECTED',
          note: withdrawalNote
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erreur lors du traitement de la demande: ${response.statusText}`)
      }
      
      toast({
        title: action === 'approve' ? 'Demande approuvée' : 'Demande rejetée',
        description: action === 'approve' 
          ? 'La demande de retrait a été approuvée avec succès'
          : 'La demande de retrait a été rejetée'
      })
      
      setIsModalOpen(false)
      setSelectedWithdrawalId(null)
      setWithdrawalNote('')
      
      // Rafraîchir les données
      fetchWalletData(params.id)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive'
      })
    } finally {
      setIsProcessingWithdrawal(false)
    }
  }

  const openModal = (withdrawalId: string, action: 'approve' | 'reject') => {
    setSelectedWithdrawalId(withdrawalId)
    setModalAction(action)
    setWithdrawalNote('')
    setIsModalOpen(true)
  }

  // Filtrer les retraits en attente
  const pendingWithdrawals = walletData?.withdrawals.filter(
    withdrawal => withdrawal.status === 'PENDING'
  ) || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!walletData) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Portefeuille non trouvé</h2>
            <p className="text-muted-foreground mb-4">
              Ce portefeuille n'existe pas ou a été supprimé.
            </p>
            <Link
              href="/admin/wallets"
              className="inline-flex items-center text-custom-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste des portefeuilles
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link 
          href="/admin/wallets" 
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste des portefeuilles
        </Link>
      </div>
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          {walletData.producer.companyName || "Entreprise sans nom"}
        </h1>
        
        <button 
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4" /> 
          Exporter
        </button>
      </div>
      
      {/* Résumé du portefeuille */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-custom-accent/10 rounded-full">
              <Wallet className="h-5 w-5 text-custom-accent" />
            </div>
            <span className="text-sm text-muted-foreground">Solde disponible</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.balance)}</p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-muted-foreground">En attente</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.pendingBalance)}</p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-muted-foreground">Total retiré</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.totalWithdrawn)}</p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <ArrowUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-muted-foreground">Total gagné</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.totalEarned)}</p>
        </div>
      </div>
      
      {/* Informations du producteur */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Informations du producteur</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Entreprise</p>
                  <p className="font-medium">{walletData.producer.companyName || "Non renseigné"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{walletData.producer.user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{walletData.producer.user.phone || "Non renseigné"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{walletData.producer.address || "Non renseignée"}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Informations bancaires</h3>
            {walletData.producer.iban ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Banque</p>
                    <p className="font-medium">{walletData.producer.bankName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Titulaire</p>
                    <p className="font-medium">{walletData.producer.bankAccountName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">IBAN</p>
                    <p className="font-medium">{walletData.producer.iban}</p>
                  </div>
                </div>
                
                {walletData.producer.bic && (
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">BIC/SWIFT</p>
                      <p className="font-medium">{walletData.producer.bic}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Informations bancaires non configurées
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Le producteur n'a pas encore configuré ses informations bancaires.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Demandes de retrait en attente */}
      <h2 className="text-xl font-semibold mb-4">Demandes de retrait en attente</h2>
      
      {pendingWithdrawals.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center mb-8">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Aucune demande en attente</h3>
          <p className="text-muted-foreground">
            Ce producteur n'a pas de demandes de retrait en attente.
          </p>
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date de demande</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-medium">IBAN</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {pendingWithdrawals.map(withdrawal => {
                // Formatter la date
                const requestDate = new Date(withdrawal.requestedAt)
                const formattedDate = format(requestDate, 'PPP', { locale: fr })
                
                // Extraire les détails bancaires
                const bankDetails = JSON.parse(withdrawal.bankDetails)
                
                return (
                  <tr key={withdrawal.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {formatPrice(withdrawal.amount)}
                    </td>
                    <td className="px-4 py-4">
                      {bankDetails.iban}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(withdrawal.id, 'approve')}
                          className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3 inline-block mr-1" />
                          Approuver
                        </button>
                        <button
                          onClick={() => openModal(withdrawal.id, 'reject')}
                          className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <XCircle className="h-3 w-3 inline-block mr-1" />
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Historique des retraits */}
      <h2 className="text-xl font-semibold mb-4">Historique des retraits</h2>
      
      {walletData.withdrawals.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center mb-8">
          <ArrowDown className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Aucun historique de retrait</h3>
          <p className="text-muted-foreground">
            Ce producteur n'a pas encore effectué de retrait.
          </p>
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date de demande</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Montant</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Note</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date de traitement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {walletData.withdrawals.filter(w => w.status !== 'PENDING').map(withdrawal => {
                // Formatter les dates
                const requestDate = new Date(withdrawal.requestedAt)
                const formattedRequestDate = format(requestDate, 'PPP', { locale: fr })
                
                const processedDate = withdrawal.processedAt ? new Date(withdrawal.processedAt) : null
                const formattedProcessedDate = processedDate ? format(processedDate, 'PPP', { locale: fr }) : '-'
                
                // Déterminer le style du statut
                let statusStyle = ""
                let statusText = ""
                let statusIcon = null
                
                switch (withdrawal.status) {
                  case 'COMPLETED':
                    statusStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                    statusText = "Traité"
                    statusIcon = <CheckCircle className="h-3 w-3 inline mr-1" />
                    break
                  case 'PROCESSING':
                    statusStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    statusText = "En cours"
                    statusIcon = <Clock className="h-3 w-3 inline mr-1" />
                    break
                  case 'REJECTED':
                    statusStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    statusText = "Rejeté"
                    statusIcon = <XCircle className="h-3 w-3 inline mr-1" />
                    break
                  default:
                    statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    statusText = withdrawal.status
                }
                
                return (
                  <tr key={withdrawal.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>{formattedRequestDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {formatPrice(withdrawal.amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                        {statusIcon}{statusText}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {withdrawal.processorNote || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {formattedProcessedDate}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Historique des transactions */}
      <h2 className="text-xl font-semibold mb-4">Historique des transactions</h2>
      
      {walletData.transactions.length === 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">Aucune transaction</h3>
          <p className="text-muted-foreground">
            Ce producteur n'a pas encore effectué de transactions.
          </p>
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Montant</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {walletData.transactions.map(transaction => {
                // Formatter la date
                const transactionDate = new Date(transaction.createdAt)
                const formattedDate = format(transactionDate, 'PPP', { locale: fr })
                
                // Déterminer le style du type
                let typeStyle = ""
                let typeText = ""
                
                switch (transaction.type) {
                  case 'SALE':
                    typeStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                    typeText = "Vente"
                    break
                  case 'WITHDRAWAL':
                    typeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                    typeText = "Retrait"
                    break
                  case 'REFUND':
                    typeStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    typeText = "Remboursement"
                    break
                  case 'ADJUSTMENT':
                    typeStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    typeText = "Ajustement"
                    break
                  case 'FEE':
                    typeStyle = "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                    typeText = "Frais"
                    break
                  default:
                    typeStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    typeText = transaction.type
                }
                
                // Déterminer le style du statut
                let statusStyle = ""
                let statusText = ""
                
                switch (transaction.status) {
                  case 'COMPLETED':
                    statusStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                    statusText = "Complété"
                    break
                  case 'PENDING':
                    statusStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                    statusText = "En attente"
                    break
                  case 'FAILED':
                    statusStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    statusText = "Échoué"
                    break
                  case 'CANCELLED':
                    statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    statusText = "Annulé"
                    break
                  default:
                    statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    statusText = transaction.status
                }
                
                return (
                  <tr key={transaction.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {transaction.description || `Transaction #${transaction.id.substring(0, 8)}`}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeStyle}`}>
                        {typeText}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-medium">
                      {formatPrice(transaction.amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal de confirmation pour les actions sur les retraits */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-md w-full p-6 shadow-lg">
           <h3 className="text-lg font-semibold mb-4">
             {modalAction === 'approve' ? 'Approuver le retrait' : 'Rejeter le retrait'}
           </h3>
           
           <p className="mb-4">
             {modalAction === 'approve' 
               ? 'Êtes-vous sûr de vouloir approuver cette demande de retrait ? Cette action confirmera que le virement a été effectué.'
               : 'Êtes-vous sûr de vouloir rejeter cette demande de retrait ? Veuillez indiquer la raison du rejet.'}
           </p>
           
           <div className="mb-4">
             <label htmlFor="note" className="block text-sm font-medium mb-1">
               {modalAction === 'approve' ? 'Référence du virement (optionnel)' : 'Raison du rejet'}
             </label>
             <textarea
               id="note"
               value={withdrawalNote}
               onChange={(e) => setWithdrawalNote(e.target.value)}
               rows={3}
               className="w-full border border-input rounded-md p-2"
               placeholder={modalAction === 'approve' 
                 ? 'Ex: Référence bancaire, numéro de transaction...'
                 : 'Ex: Informations bancaires incorrectes...'}
               required={modalAction === 'reject'}
             />
           </div>
           
           <div className="flex gap-4 justify-end">
             <button
               onClick={() => setIsModalOpen(false)}
               className="px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
             >
               Annuler
             </button>
             
             <LoadingButton
               onClick={() => handleWithdrawalAction(modalAction)}
               isLoading={isProcessingWithdrawal}
               disabled={modalAction === 'reject' && !withdrawalNote.trim()}
               className={
                 modalAction === 'approve'
                   ? 'bg-green-600 hover:bg-green-700 text-white'
                   : 'bg-red-600 hover:bg-red-700 text-white'
               }
             >
               {modalAction === 'approve' ? 'Confirmer le paiement' : 'Rejeter la demande'}
             </LoadingButton>
           </div>
         </div>
       </div>
     )}
   </div>
 )
}