// app/(protected)/producer/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  Wallet, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  ShoppingBag,
  Search
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatPrice } from '@/lib/number-utils'

export default function ProducerWalletPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [walletData, setWalletData] = useState<any>(null)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions')

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/wallet')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données du portefeuille')
      }
      
      const data = await response.json()
      setWalletData(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du portefeuille",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdrawalRequest = async () => {
    try {
      setIsProcessingWithdrawal(true)
      
      const amount = parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Montant invalide')
      }
      
      if (amount > (walletData?.balance || 0)) {
        throw new Error('Montant supérieur au solde disponible')
      }
      
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Erreur lors de la demande de retrait')
      }
      
      toast({
        title: "Demande envoyée",
        description: "Votre demande de retrait a été soumise avec succès"
      })
      
      setIsWithdrawModalOpen(false)
      setWithdrawAmount('')
      fetchWalletData() // Rafraîchir les données
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de traiter votre demande",
        variant: "destructive"
      })
    } finally {
      setIsProcessingWithdrawal(false)
    }
  }

  // Filtrer les transactions selon la recherche
  const filteredTransactions = walletData?.transactions?.filter((transaction: any) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    const description = transaction.description?.toLowerCase() || ''
    const type = transaction.type?.toLowerCase() || ''
    const status = transaction.status?.toLowerCase() || ''
    
    return description.includes(searchLower) || type.includes(searchLower) || status.includes(searchLower)
  }) || []

  // Filtrer les demandes de retrait selon la recherche
  const filteredWithdrawals = walletData?.withdrawals?.filter((withdrawal: any) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    const status = withdrawal.status?.toLowerCase() || ''
    
    return status.includes(searchLower)
  }) || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mon portefeuille</h1>
        <p className="text-muted-foreground">
          Gérez vos revenus et demandez des retraits
        </p>
      </div>
      
      {/* Soldes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-custom-accent/10 rounded-full">
              <Wallet className="h-6 w-6 text-custom-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solde disponible (retirable)</p>
              <p className="text-2xl font-semibold text-custom-title">
                {formatPrice(walletData?.balance || 0)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={(walletData?.balance || 0) <= 0}
              className="w-full bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Demander un retrait
            </button>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente (non retirable)</p>
              <p className="text-2xl font-semibold text-custom-title">
                {formatPrice(walletData?.pendingBalance || 0)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ces montants seront disponibles lorsque les commandes correspondantes seront marquées comme livrées
          </p>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total gagné</p>
              <p className="text-2xl font-semibold text-custom-title">
                {formatPrice(walletData?.totalEarned || 0)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Depuis la création de votre compte
          </p>
        </div>
      </div>
      
      {/* Explications sur le fonctionnement des soldes */}
      <div className="mt-6 bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-3">Comprendre votre portefeuille</h3>
        
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-custom-accent/10 rounded-full mt-0.5">
              <Wallet className="h-4 w-4 text-custom-accent" />
            </div>
            <div>
              <p className="font-medium">Solde disponible</p>
              <p className="text-muted-foreground">
                Ce montant peut être retiré immédiatement. Il représente les paiements issus de commandes
                qui ont été entièrement livrées.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mt-0.5">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-medium">Solde en attente</p>
              <p className="text-muted-foreground">
                Ces montants proviennent de commandes qui ont été confirmées mais pas encore livrées.
                Ils seront disponibles automatiquement dès que les commandes correspondantes seront
                marquées comme livrées.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full mt-0.5">
              <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">Total gagné</p>
              <p className="text-muted-foreground">
                Le montant total que vous avez gagné depuis la création de votre compte, incluant à la fois
                les montants disponibles, en attente, et déjà retirés.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Onglets */}
      <div className="flex border-b border-foreground/10 mb-6">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 border-b-2 ${
            activeTab === 'transactions' 
              ? 'border-custom-accent text-custom-accent' 
              : 'border-transparent text-foreground/60 hover:text-foreground'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 border-b-2 ${
            activeTab === 'withdrawals' 
              ? 'border-custom-accent text-custom-accent' 
              : 'border-transparent text-foreground/60 hover:text-foreground'
          }`}
        >
          Demandes de retrait
        </button>
      </div>
      
      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
          />
        </div>
      </div>
      
      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Aucune transaction trouvée</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Aucune transaction ne correspond à votre recherche."
                  : "Vous n'avez pas encore de transactions."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/5">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction: any) => {
                    // Formater la date
                    const transactionDate = new Date(transaction.createdAt)
                    const formattedDate = format(transactionDate, 'PPP', { locale: fr })
                    
                    // Déterminer le style du type
                    let typeStyle = ""
                    let typeIcon = null
                    
                    switch (transaction.type) {
                      case 'SALE':
                        typeStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        typeIcon = <ArrowUp className="h-3 w-3 inline mr-1" />
                        break
                      case 'WITHDRAWAL':
                        typeStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        typeIcon = <ArrowDown className="h-3 w-3 inline mr-1" />
                        break
                      case 'REFUND':
                        typeStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        typeIcon = <ArrowDown className="h-3 w-3 inline mr-1" />
                        break
                      default:
                        typeStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    }
                    
                    // Déterminer le style du statut
                    let statusStyle = ""
                    let statusIcon = null
                    
                    switch (transaction.status) {
                      case 'COMPLETED':
                        statusStyle = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        statusIcon = <CheckCircle className="h-3 w-3 inline mr-1" />
                        break
                      case 'PENDING':
                        statusStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        statusIcon = <Clock className="h-3 w-3 inline mr-1" />
                        break
                      case 'FAILED':
                      case 'CANCELLED':
                        statusStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        statusIcon = <AlertCircle className="h-3 w-3 inline mr-1" />
                        break
                      default:
                        statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                    }
                    
                    // Formater le montant (si négatif, afficher en rouge)
                    const isNegative = transaction.amount < 0
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-foreground/5">
                        <td className="py-4 px-4 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {transaction.description || `Transaction #${transaction.id.substring(0, 8)}`}
                        </td>
                        <td className={`py-4 px-4 text-right whitespace-nowrap font-medium ${
                         isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                       }`}>
                         {formatPrice(Math.abs(transaction.amount))}
                       </td>
                       <td className="py-4 px-4 text-center whitespace-nowrap">
                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeStyle}`}>
                           {typeIcon}{transaction.type}
                         </span>
                       </td>
                       <td className="py-4 px-4 text-center whitespace-nowrap">
                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                           {statusIcon}{transaction.status}
                         </span>
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
         )}
       </div>
     )}
     
     {/* Demandes de retrait */}
     {activeTab === 'withdrawals' && (
       <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm">
         {filteredWithdrawals.length === 0 ? (
           <div className="p-8 text-center">
             <ArrowDown className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
             <h3 className="text-lg font-medium mb-2">Aucune demande de retrait trouvée</h3>
             <p className="text-muted-foreground">
               {searchTerm 
                 ? "Aucune demande ne correspond à votre recherche."
                 : "Vous n'avez pas encore effectué de demande de retrait."}
             </p>
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="border-b border-foreground/10 bg-foreground/5">
                   <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                     Date de demande
                   </th>
                   <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                     Montant
                   </th>
                   <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                     Statut
                   </th>
                   <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                     Notes
                   </th>
                   <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                     Date traitement
                   </th>
                 </tr>
               </thead>
               <tbody>
                 {filteredWithdrawals.map((withdrawal: any) => {
                   // Formater les dates
                   const requestDate = new Date(withdrawal.requestedAt)
                   const formattedRequestDate = format(requestDate, 'PPP', { locale: fr })
                   
                   const processedDate = withdrawal.processedAt ? new Date(withdrawal.processedAt) : null
                   const formattedProcessedDate = processedDate 
                     ? format(processedDate, 'PPP', { locale: fr })
                     : '-'
                   
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
                     case 'PENDING':
                       statusStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                       statusText = "En attente"
                       statusIcon = <Clock className="h-3 w-3 inline mr-1" />
                       break
                     case 'PROCESSING':
                       statusStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                       statusText = "En cours"
                       statusIcon = <Clock className="h-3 w-3 inline mr-1" />
                       break
                     case 'REJECTED':
                       statusStyle = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                       statusText = "Rejeté"
                       statusIcon = <AlertCircle className="h-3 w-3 inline mr-1" />
                       break
                     default:
                       statusStyle = "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                       statusText = withdrawal.status
                   }
                   
                   return (
                     <tr key={withdrawal.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                       <td className="py-4 px-4 whitespace-nowrap">
                         {formattedRequestDate}
                       </td>
                       <td className="py-4 px-4 text-right whitespace-nowrap font-medium">
                         {formatPrice(withdrawal.amount)}
                       </td>
                       <td className="py-4 px-4 text-center whitespace-nowrap">
                         <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                           {statusIcon}{statusText}
                         </span>
                       </td>
                       <td className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground">
                         {withdrawal.processorNote || '-'}
                       </td>
                       <td className="py-4 px-4 text-center whitespace-nowrap text-sm">
                         {formattedProcessedDate}
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
         )}
       </div>
     )}
     
     {/* Modal de retrait */}
     {isWithdrawModalOpen && (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
         <div className="bg-background rounded-lg max-w-md w-full p-6 shadow-lg">
           <h3 className="text-lg font-semibold mb-4">Demande de retrait</h3>
           
           <div className="mb-4">
             <label htmlFor="amount" className="block text-sm font-medium mb-1">Montant (CHF)</label>
             <input
               type="number"
               id="amount"
               value={withdrawAmount}
               onChange={(e) => setWithdrawAmount(e.target.value)}
               min="10"
               max={walletData?.balance || 0}
               step="0.01"
               className="w-full border border-foreground/10 rounded-md p-2"
               placeholder="0.00"
             />
             <p className="mt-1 text-xs text-muted-foreground">
               Solde disponible: {formatPrice(walletData?.balance || 0)}
             </p>
           </div>
           
           <div className="bg-foreground/5 p-4 rounded-md mb-4">
             <h4 className="font-medium text-sm mb-2">Informations bancaires</h4>
             <p className="text-xs text-muted-foreground mb-2">
               Le paiement sera effectué sur le compte bancaire que vous avez renseigné dans vos paramètres.
             </p>
             <div className="text-xs space-y-1">
               <p><span className="font-medium">Banque:</span> {walletData?.producer?.bankName || 'Non renseigné'}</p>
               <p><span className="font-medium">Titulaire:</span> {walletData?.producer?.bankAccountName || 'Non renseigné'}</p>
               <p><span className="font-medium">IBAN:</span> {walletData?.producer?.iban || 'Non renseigné'}</p>
             </div>
           </div>
           
           <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-xs text-yellow-800 dark:text-yellow-300 mb-4">
             <AlertCircle className="h-4 w-4 inline-block mr-2" />
             Les demandes de retrait sont traitées dans un délai de 2 à 5 jours ouvrables.
           </div>
           
           <div className="flex gap-4 justify-end">
             <button
               onClick={() => setIsWithdrawModalOpen(false)}
               className="px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5"
             >
               Annuler
             </button>
             
             <LoadingButton
               onClick={handleWithdrawalRequest}
               isLoading={isProcessingWithdrawal}
               disabled={
                 !withdrawAmount || 
                 parseFloat(withdrawAmount) <= 0 || 
                 parseFloat(withdrawAmount) > (walletData?.balance || 0)
               }
               className="px-4 py-2 bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity"
             >
               Confirmer
             </LoadingButton>
           </div>
         </div>
       </div>
     )}
   </div>
 )
}