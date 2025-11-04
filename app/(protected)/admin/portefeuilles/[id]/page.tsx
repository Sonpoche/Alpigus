// Chemin du fichier: app/(protected)/admin/wallets/[id]/page.tsx
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

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t-2 border-gray-200 gap-3">
        <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
          Page {currentPage} sur {totalPages}
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm border-2 border-black rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page = i + 1
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
              }
              
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 text-xs md:text-sm rounded-md transition-colors font-semibold ${
                    currentPage === page
                      ? 'bg-black text-white'
                      : 'border-2 border-black hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-black text-white border-2 border-black rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:bg-gray-800"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'PENDING': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' },
      'COMPLETED': { label: 'Terminé', className: 'bg-green-100 text-green-800 border-2 border-green-500' },
      'REJECTED': { label: 'Rejeté', className: 'bg-red-100 text-red-800 border-2 border-red-500' },
      'CANCELLED': { label: 'Annulé', className: 'bg-gray-100 text-gray-800 border-2 border-gray-500' }
    }
    
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-2 border-gray-500' }
    
    return (
      <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-bold ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
        </div>
      </div>
    )
  }

  if (!walletData) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Portefeuille non trouvé</h2>
          <p className="text-gray-600 mb-4">
            Le portefeuille demandé n'existe pas ou a été supprimé.
          </p>
          <Link
            href="/admin/wallets"
            className="inline-flex items-center text-black hover:underline font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste des portefeuilles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="mb-6">
        <Link 
          href="/admin/wallets" 
          className="flex items-center text-gray-600 hover:text-black transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste des portefeuilles
        </Link>
      </div>
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-black">
          {walletData.producer.companyName || "Entreprise sans nom"}
        </h1>
      </div>
      
      {/* Résumé du portefeuille - RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 bg-blue-100 rounded-full border-2 border-blue-500 flex-shrink-0">
              <Wallet className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <span className="text-xs md:text-sm text-gray-600 font-medium">Solde disponible</span>
          </div>
          <p className="text-xl md:text-2xl font-bold pl-10 md:pl-12 text-black">{formatPrice(walletData.balance)}</p>
        </div>
        
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 bg-orange-100 rounded-full border-2 border-orange-500 flex-shrink-0">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
            </div>
            <span className="text-xs md:text-sm text-gray-600 font-medium">En attente</span>
          </div>
          <p className="text-xl md:text-2xl font-bold pl-10 md:pl-12 text-black">{formatPrice(walletData.pendingBalance)}</p>
        </div>
        
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 bg-green-100 rounded-full border-2 border-green-500 flex-shrink-0">
              <ArrowUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </div>
            <span className="text-xs md:text-sm text-gray-600 font-medium">Total gagné</span>
          </div>
          <p className="text-xl md:text-2xl font-bold pl-10 md:pl-12 text-black">{formatPrice(walletData.totalEarned)}</p>
        </div>
        
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 bg-red-100 rounded-full border-2 border-red-500 flex-shrink-0">
              <ArrowDown className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
            </div>
            <span className="text-xs md:text-sm text-gray-600 font-medium">Total retiré</span>
          </div>
          <p className="text-xl md:text-2xl font-bold pl-10 md:pl-12 text-black">{formatPrice(walletData.totalWithdrawn)}</p>
        </div>
      </div>

      {/* Informations du producteur - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-black">
          <Building className="h-5 w-5" />
          Informations du producteur
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold mb-3 text-black">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <span className="text-sm md:text-base truncate">{walletData.producer.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <span className="text-sm md:text-base truncate">{walletData.producer.user.email}</span>
              </div>
              {walletData.producer.user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-base">{walletData.producer.user.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-bold mb-3 text-black">Informations bancaires</h3>
            <div className="space-y-2">
              {walletData.producer.bankName && (
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-base truncate">{walletData.producer.bankName}</span>
                </div>
              )}
              {walletData.producer.iban && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-base font-mono truncate">{walletData.producer.iban}</span>
                </div>
              )}
              {walletData.producer.bic && (
                <div className="text-sm text-gray-600">
                  BIC: {walletData.producer.bic}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demandes de retrait en attente - RESPONSIVE */}
      {walletData.withdrawals.some(w => w.status === 'PENDING') && (
        <div className="bg-white border-2 border-orange-500 rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-orange-900">
            <Clock className="h-5 w-5 text-orange-600" />
            Demandes de retrait en attente
          </h2>
          
          <div className="space-y-4">
            {walletData.withdrawals.filter(w => w.status === 'PENDING').map((withdrawal) => (
              <div key={withdrawal.id} className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-lg md:text-xl text-black">{formatPrice(withdrawal.amount)}</span>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 mb-2">
                      Demandé le {format(new Date(withdrawal.requestedAt), 'PPP', { locale: fr })}
                    </div>
                    <div className="text-xs md:text-sm">
                      <strong>Coordonnées bancaires:</strong> {withdrawal.bankDetails}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openWithdrawalModal(withdrawal.id, 'approve')}
                      className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white border-2 border-green-600 rounded-md hover:bg-green-700 transition-colors text-sm font-bold"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => openWithdrawalModal(withdrawal.id, 'reject')}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white border-2 border-red-600 rounded-md hover:bg-red-700 transition-colors text-sm font-bold"
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

      {/* Historique des retraits - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-black">
          <ArrowDown className="h-5 w-5" />
          Historique des retraits ({walletData.withdrawals.length})
        </h2>
        
        {walletData.withdrawals.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Aucun retrait effectué</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Montant</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Statut</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Date demande</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Date traitement</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Référence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getPaginatedWithdrawals().map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-bold text-black">{formatPrice(withdrawal.amount)}</td>
                        <td className="py-3 px-4">{getStatusBadge(withdrawal.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {format(new Date(withdrawal.requestedAt), 'PPP', { locale: fr })}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {withdrawal.processedAt 
                            ? format(new Date(withdrawal.processedAt), 'PPP', { locale: fr })
                            : '-'
                          }
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {withdrawal.reference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <PaginationControls
              currentPage={withdrawalsPage}
              totalPages={getTotalWithdrawalPages()}
              onPageChange={goToWithdrawalPage}
              itemName="retraits"
            />
          </>
        )}
      </div>

      {/* Historique des transactions - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-black">
          <Activity className="h-5 w-5" />
          Historique des transactions ({walletData.transactions.length})
        </h2>
        
        {walletData.transactions.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Aucune transaction</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Type</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Montant</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Statut</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Description</th>
                      <th className="text-left py-3 px-4 font-bold text-black text-sm">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getPaginatedTransactions().map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {transaction.amount > 0 || transaction.type === 'SALE' ? (
                              <ArrowUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-sm font-semibold">
                              {transaction.type === 'SALE' ? 'Vente' : 
                               transaction.type === 'WITHDRAWAL' ? 'Retrait' :
                               transaction.amount > 0 ? 'Crédit' : 'Débit'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${
                            transaction.type === 'SALE' || transaction.amount > 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'SALE' || transaction.amount > 0 
                              ? '+' : ''}
                            {formatPrice(Math.abs(transaction.amount))}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(transaction.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[200px]">
                          {transaction.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {format(new Date(transaction.createdAt), 'PPP', { locale: fr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
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
            <DialogTitle className="text-xl font-bold">
              {modalAction === 'approve' ? 'Approuver' : 'Rejeter'} la demande de retrait
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-700 font-medium">
                {modalAction === 'approve' 
                  ? 'Vous êtes sur le point d\'approuver cette demande de retrait.'
                  : 'Vous êtes sur le point de rejeter cette demande de retrait.'
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2 text-black">
                Note (optionnel)
              </label>
              <textarea
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                placeholder={modalAction === 'approve' 
                  ? 'Note interne pour l\'approbation...'
                  : 'Raison du rejet...'
                }
                className="w-full p-3 border-2 border-gray-300 rounded-md resize-none h-20 focus:border-black focus:outline-none"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold"
              >
                Annuler
              </button>
              
              <LoadingButton
                onClick={() => handleWithdrawalAction(modalAction)}
                isLoading={isProcessingWithdrawal}
                className={`flex-1 ${modalAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700 border-2 border-green-600' 
                  : 'bg-red-600 hover:bg-red-700 border-2 border-red-600'
                } text-white font-bold rounded-md px-4 py-2.5 flex items-center justify-center gap-2`}
              >
                {modalAction === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approuver
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
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