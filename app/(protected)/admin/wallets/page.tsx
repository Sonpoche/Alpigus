// app/(protected)/admin/wallets/page.tsx - VERSION CORRIGÉE
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
import { Badge } from '@/components/ui/badge'
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
      
      // ✅ CORRECTION: Appel API simple avec timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 secondes timeout
      
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
      
      // ✅ CORRECTION: Vérifier que les données sont valides
      if (!Array.isArray(data)) {
        throw new Error('Format de données invalide')
      }
      
      setWallets(data)
      
      // Calculer les statistiques
      const totalWallets = data.length
      const totalBalance = data.reduce((sum, wallet) => sum + (wallet.balance || 0), 0)
      const totalPendingWithdrawals = data.reduce((sum, wallet) => sum + (wallet.pendingWithdrawals || 0), 0)
      const totalEarned = data.reduce((sum, wallet) => sum + (wallet.totalEarned || 0), 0)
      
      setStats({
        totalWallets,
        totalBalance,
        totalPendingWithdrawals,
        totalEarned
      })
      
    } catch (error) {
      console.error('Erreur lors du chargement des portefeuilles:', error)
      
      // ✅ CORRECTION: Gestion spécifique des erreurs
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

  // Filtrer les portefeuilles
  const filteredWallets = wallets.filter(wallet => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      wallet.producer.companyName.toLowerCase().includes(searchLower) ||
      wallet.producer.user.name.toLowerCase().includes(searchLower) ||
      wallet.producer.user.email.toLowerCase().includes(searchLower)
    )
  })

  // ✅ CORRECTION: Écran de chargement simple
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des portefeuilles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Gestion des portefeuilles</h1>
          <p className="text-muted-foreground">
            Gérez les portefeuilles des producteurs et les demandes de retrait
          </p>
        </div>
        
        <LoadingButton 
          onClick={handleRefresh}
          isLoading={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </LoadingButton>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total portefeuilles</p>
              <p className="text-2xl font-bold">{stats.totalWallets}</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solde total</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalBalance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retraits en attente</p>
              <p className="text-2xl font-bold">{stats.totalPendingWithdrawals}</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <ArrowUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total gagné</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalEarned)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-foreground/10 rounded-lg"
          />
        </div>
      </div>

      {/* Liste des portefeuilles */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-foreground/5">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Producteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Solde disponible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total gagné
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Retraits en attente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">Aucun portefeuille trouvé</p>
                      <p className="text-sm">
                        {searchTerm ? 'Aucun résultat pour votre recherche' : 'Les portefeuilles apparaîtront ici'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-foreground/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-foreground/10 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{wallet.producer.companyName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {wallet.producer.user.name}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {wallet.producer.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-lg">{formatPrice(wallet.balance)}</div>
                      {wallet.pendingBalance > 0 && (
                        <div className="text-sm text-muted-foreground">
                          + {formatPrice(wallet.pendingBalance)} en attente
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{formatPrice(wallet.totalEarned)}</div>
                      {wallet.totalWithdrawn > 0 && (
                        <div className="text-sm text-muted-foreground">
                          - {formatPrice(wallet.totalWithdrawn)} retiré
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {wallet.pendingWithdrawals > 0 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {wallet.pendingWithdrawals} demande{wallet.pendingWithdrawals > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Aucune demande
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/wallets/${wallet.id}`}
                        className="inline-flex items-center gap-1 text-custom-accent hover:underline"
                      >
                        <Eye className="h-4 w-4" />
                        Voir détails
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
  )
}