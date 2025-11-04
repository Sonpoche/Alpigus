// Chemin du fichier: app/(protected)/admin/wallets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  Wallet, 
  Users, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Eye,
  RefreshCw,
  Building,
  Mail,
  Phone,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatPrice } from '@/lib/number-utils'

interface WalletData {
  id: string
  balance: number
  pendingBalance: number
  totalEarned: number
  totalWithdrawn: number
  pendingWithdrawals: number
  producer: {
    id: string
    companyName: string
    user: {
      name: string
      email: string
      phone?: string
    }
  }
}

export default function AdminWalletsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalBalance: 0,
    totalPendingWithdrawals: 0,
    totalEarned: 0
  })

  useEffect(() => {
    fetchWallets()
  }, [])

  const fetchWallets = async () => {
    try {
      setIsLoading(true)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch('/api/admin/wallets', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'pragma': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Vérifier si data est un objet avec une propriété wallets ou directement un tableau
      let walletsData: WalletData[] = []
      
      if (Array.isArray(data)) {
        walletsData = data
      } else if (data && Array.isArray(data.wallets)) {
        walletsData = data.wallets
      } else if (data && typeof data === 'object') {
        // Si c'est un objet mais pas un tableau, essayer de le convertir
        console.log('Format de données reçu:', data)
        walletsData = []
      } else {
        throw new Error('Format de données invalide')
      }
      
      setWallets(walletsData)
      
      // Calculer les statistiques
      const totalWallets = walletsData.length
      const totalBalance = walletsData.reduce((sum, wallet) => sum + (wallet.balance || 0), 0)
      const totalPendingWithdrawals = walletsData.reduce((sum, wallet) => sum + (wallet.pendingWithdrawals || 0), 0)
      const totalEarned = walletsData.reduce((sum, wallet) => sum + (wallet.totalEarned || 0), 0)
      
      setStats({
        totalWallets,
        totalBalance,
        totalPendingWithdrawals,
        totalEarned
      })
      
    } catch (error) {
      console.error('Erreur lors du chargement des portefeuilles:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast({
            title: "Timeout",
            description: "La requête a pris trop de temps. Veuillez réessayer.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Erreur",
            description: error.message || "Impossible de charger les portefeuilles",
            variant: "destructive"
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchWallets()
    setIsRefreshing(false)
  }

  const filteredWallets = wallets.filter(wallet => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      wallet.producer.companyName.toLowerCase().includes(searchLower) ||
      wallet.producer.user.name.toLowerCase().includes(searchLower) ||
      wallet.producer.user.email.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header - RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black">Gestion des portefeuilles</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Gérez les portefeuilles des producteurs et les demandes de retrait
          </p>
        </div>
        
        <LoadingButton 
          onClick={handleRefresh}
          isLoading={isRefreshing}
          className="w-full sm:w-auto bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </LoadingButton>
      </div>

      {/* Statistiques - RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-blue-100 rounded-full border-2 border-blue-500 flex-shrink-0">
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Total portefeuilles</p>
              <p className="text-xl md:text-2xl font-bold text-black truncate">{stats.totalWallets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-green-100 rounded-full border-2 border-green-500 flex-shrink-0">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Solde total</p>
              <p className="text-xl md:text-2xl font-bold text-black truncate">{formatPrice(stats.totalBalance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-orange-100 rounded-full border-2 border-orange-500 flex-shrink-0">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Retraits en attente</p>
              <p className="text-xl md:text-2xl font-bold text-black truncate">{stats.totalPendingWithdrawals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-purple-100 rounded-full border-2 border-purple-500 flex-shrink-0">
              <ArrowUp className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Total gagné</p>
              <p className="text-xl md:text-2xl font-bold text-black truncate">{formatPrice(stats.totalEarned)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg p-3 md:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Liste des portefeuilles - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                    Producteur
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                    Solde disponible
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                    Total gagné
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                    Retraits en attente
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Wallet className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-base md:text-lg font-medium text-gray-600">Aucun portefeuille trouvé</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchTerm ? 'Aucun résultat pour votre recherche' : 'Les portefeuilles apparaîtront ici'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300 flex-shrink-0">
                            <Building className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-black truncate">{wallet.producer.companyName}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{wallet.producer.user.name}</span>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{wallet.producer.user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="font-bold text-lg text-black">{formatPrice(wallet.balance)}</div>
                        {wallet.pendingBalance > 0 && (
                          <div className="text-sm text-gray-600">
                            + {formatPrice(wallet.pendingBalance)} en attente
                          </div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="font-bold text-black">{formatPrice(wallet.totalEarned)}</div>
                        {wallet.totalWithdrawn > 0 && (
                          <div className="text-sm text-gray-600">
                            - {formatPrice(wallet.totalWithdrawn)} retiré
                          </div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        {wallet.pendingWithdrawals > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border-2 border-orange-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {wallet.pendingWithdrawals} demande{wallet.pendingWithdrawals > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border-2 border-gray-400">
                            Aucune demande
                          </span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <Link
                          href={`/admin/wallets/${wallet.id}`}
                          className="inline-flex items-center gap-2 p-2 border-2 border-black rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="h-4 w-4 text-black" />
                          <span className="font-semibold text-black text-sm">Voir détails</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}