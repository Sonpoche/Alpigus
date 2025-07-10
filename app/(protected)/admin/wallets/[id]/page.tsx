// app/(protected)/admin/wallets/[id]/page.tsx - VERSION AVEC PAGINATION
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
  Download,
  ChevronLeft,
  ChevronRight,
  Activity,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { LoadingButton } from '@/components/ui/loading-button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

// Constantes pour la pagination
const ITEMS_PER_PAGE = 5

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
  
  // ✅ NOUVEAU: États pour la pagination
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [withdrawalsPage, setWithdrawalsPage] = useState(1)

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
        description: error instanceof Error ? error.message : 'Erreur lors du traitement',
        variant: 'destructive'
      })
    } finally {
      setIsProcessingWithdrawal(false)
    }
  }

  const openWithdrawalModal = (withdrawalId: string, action: 'approve' | 'reject') => {
    setSelectedWithdrawalId(withdrawalId)
    setModalAction(action)
    setIsModalOpen(true)
  }

  // ✅ NOUVEAU: Fonctions de pagination pour les transactions
  const getPaginatedTransactions = () => {
    if (!walletData?.transactions) return []
    const startIndex = (transactionsPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return walletData.transactions.slice(startIndex, endIndex)
  }

  const getTotalTransactionPages = () => {
    if (!walletData?.transactions) return 0
    return Math.ceil(walletData.transactions.length / ITEMS_PER_PAGE)
  }

  const goToTransactionPage = (page: number) => {
    const totalPages = getTotalTransactionPages()
    if (page >= 1 && page <= totalPages) {
      setTransactionsPage(page)
    }
  }

  // ✅ NOUVEAU: Fonctions de pagination pour les retraits
  const getPaginatedWithdrawals = () => {
    if (!walletData?.withdrawals) return []
    const startIndex = (withdrawalsPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return walletData.withdrawals.slice(startIndex, endIndex)
  }

  const getTotalWithdrawalPages = () => {
    if (!walletData?.withdrawals) return 0
    return Math.ceil(walletData.withdrawals.length / ITEMS_PER_PAGE)
  }

  const goToWithdrawalPage = (page: number) => {
    const totalPages = getTotalWithdrawalPages()
    if (page >= 1 && page <= totalPages) {
      setWithdrawalsPage(page)
    }
  }

  // ✅ NOUVEAU: Composant de pagination réutilisable
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    itemName 
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    itemName: string
  }) => {
    if (totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages = []
      const maxVisible = 5
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        const start = Math.max(1, currentPage - 2)
        const end = Math.min(totalPages, currentPage + 2)
        
        if (start > 1) {
          pages.push(1)
          if (start > 2) pages.push('...')
        }
        
        for (let i = start; i <= end; i++) {
          pages.push(i)
        }
        
        if (end < totalPages) {
          if (end < totalPages - 1) pages.push('...')
          pages.push(totalPages)
        }
      }
      
      return pages
    }

    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-foreground/10">
        <div className="text-sm text-muted-foreground">
          Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, totalPages * ITEMS_PER_PAGE)} sur {totalPages * ITEMS_PER_PAGE} {itemName}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-foreground/10 text-muted-foreground cursor-not-allowed'
                : 'border-foreground/10 hover:bg-foreground/5 text-foreground'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-muted-foreground">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page as number)}
                    className={`w-8 h-8 text-sm rounded-md transition-colors ${
                      currentPage === page
                        ? 'bg-custom-accent text-white'
                        : 'border border-foreground/10 hover:bg-foreground/5 text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-foreground/10 text-muted-foreground cursor-not-allowed'
                : 'border-foreground/10 hover:bg-foreground/5 text-foreground'
            }`}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string, type: 'withdrawal' | 'transaction') => {
    const baseClass = "text-xs font-medium px-2 py-1 rounded-full"
    
    switch (status) {
      case 'PENDING':
        return <Badge className={`${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`}>En attente</Badge>
      case 'COMPLETED':
        return <Badge className={`${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`}>Terminé</Badge>
      case 'REJECTED':
        return <Badge className={`${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`}>Rejeté</Badge>
      case 'CANCELLED':
        return <Badge className={`${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`}>Annulé</Badge>
      default:
        return <Badge className={`${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`}>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent" />
        </div>
      </div>
    )
  }

  if (!walletData) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Portefeuille non trouvé</h2>
          <p className="text-muted-foreground mb-4">
            Le portefeuille demandé n'existe pas ou a été supprimé.
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
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-muted-foreground">En attente</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.pendingBalance)}</p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-muted-foreground">Total gagné</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.totalEarned)}</p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-muted-foreground">Total retiré</span>
          </div>
          <p className="text-2xl font-semibold pl-12">{formatPrice(walletData.totalWithdrawn)}</p>
        </div>
      </div>

      {/* Informations du producteur */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building className="h-5 w-5" />
          Informations du producteur
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{walletData.producer.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{walletData.producer.user.email}</span>
              </div>
              {walletData.producer.user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{walletData.producer.user.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Informations bancaires</h3>
            <div className="space-y-2">
              {walletData.producer.bankName && (
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  <span>{walletData.producer.bankName}</span>
                </div>
              )}
              {walletData.producer.iban && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{walletData.producer.iban}</span>
                </div>
              )}
              {walletData.producer.bic && (
                <div className="text-sm text-muted-foreground">
                  BIC: {walletData.producer.bic}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demandes de retrait en attente */}
      {walletData.withdrawals.some(w => w.status === 'PENDING') && (
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Demandes de retrait en attente
          </h2>
          
          <div className="space-y-4">
            {walletData.withdrawals.filter(w => w.status === 'PENDING').map((withdrawal) => (
              <div key={withdrawal.id} className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-lg">{formatPrice(withdrawal.amount)}</span>
                      {getStatusBadge(withdrawal.status, 'withdrawal')}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Demandé le {format(new Date(withdrawal.requestedAt), 'PPP', { locale: fr })}
                    </div>
                    <div className="text-sm">
                      <strong>Coordonnées bancaires:</strong> {withdrawal.bankDetails}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openWithdrawalModal(withdrawal.id, 'approve')}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => openWithdrawalModal(withdrawal.id, 'reject')}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ NOUVEAU: Historique des retraits avec pagination */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ArrowDown className="h-5 w-5" />
          Historique des retraits ({walletData.withdrawals.length})
        </h2>
        
        {walletData.withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun retrait effectué</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-3 font-medium">Montant</th>
                    <th className="text-left py-3 font-medium">Statut</th>
                    <th className="text-left py-3 font-medium">Date demande</th>
                    <th className="text-left py-3 font-medium">Date traitement</th>
                    <th className="text-left py-3 font-medium">Référence</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedWithdrawals().map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b border-foreground/10">
                      <td className="py-3 font-medium">{formatPrice(withdrawal.amount)}</td>
                      <td className="py-3">{getStatusBadge(withdrawal.status, 'withdrawal')}</td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {format(new Date(withdrawal.requestedAt), 'PPP', { locale: fr })}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {withdrawal.processedAt 
                          ? format(new Date(withdrawal.processedAt), 'PPP', { locale: fr })
                          : '-'
                        }
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {withdrawal.reference || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination des retraits */}
            <PaginationControls
              currentPage={withdrawalsPage}
              totalPages={getTotalWithdrawalPages()}
              onPageChange={goToWithdrawalPage}
              itemName="retraits"
            />
          </>
        )}
      </div>

      {/* ✅ NOUVEAU: Historique des transactions avec pagination */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Historique des transactions ({walletData.transactions.length})
        </h2>
        
        {walletData.transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune transaction</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-3 font-medium">Type</th>
                    <th className="text-left py-3 font-medium">Montant</th>
                    <th className="text-left py-3 font-medium">Statut</th>
                    <th className="text-left py-3 font-medium">Description</th>
                    <th className="text-left py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedTransactions().map((transaction) => (
                    <tr key={transaction.id} className="border-b border-foreground/10">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {/* ✅ CORRECTION: Logique basée sur le montant ET le type */}
                          {transaction.amount > 0 || transaction.type === 'SALE' ? (
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {/* ✅ CORRECTION: Affichage basé sur le type de transaction */}
                            {transaction.type === 'SALE' ? 'Vente' : 
                             transaction.type === 'WITHDRAWAL' ? 'Retrait' :
                             transaction.amount > 0 ? 'Crédit' : 'Débit'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium">
                        {/* ✅ CORRECTION: Affichage du montant selon le type */}
                        <span className={
                          transaction.type === 'SALE' || transaction.amount > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }>
                          {transaction.type === 'SALE' || transaction.amount > 0 
                            ? '+' : ''}
                          {formatPrice(Math.abs(transaction.amount))}
                        </span>
                      </td>
                      <td className="py-3">{getStatusBadge(transaction.status, 'transaction')}</td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {transaction.description || '-'}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {format(new Date(transaction.createdAt), 'PPP', { locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination des transactions */}
            <PaginationControls
              currentPage={transactionsPage}
              totalPages={getTotalTransactionPages()}
              onPageChange={goToTransactionPage}
              itemName="transactions"
            />
          </>
        )}
      </div>

      {/* Modal de traitement des retraits */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalAction === 'approve' ? 'Approuver' : 'Rejeter'} la demande de retrait
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-foreground/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {modalAction === 'approve' 
                  ? 'Vous êtes sur le point d\'approuver cette demande de retrait.'
                  : 'Vous êtes sur le point de rejeter cette demande de retrait.'
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Note (optionnel)
              </label>
              <textarea
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                placeholder={modalAction === 'approve' 
                  ? 'Note interne pour l\'approbation...'
                  : 'Raison du rejet...'
                }
                className="w-full p-3 border border-foreground/10 rounded-md resize-none h-20"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
              >
                Annuler
              </button>
              
              <LoadingButton
                onClick={() => handleWithdrawalAction(modalAction)}
                isLoading={isProcessingWithdrawal}
                className={`flex-1 ${modalAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                {modalAction === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approuver
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </>
                )}
              </LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}