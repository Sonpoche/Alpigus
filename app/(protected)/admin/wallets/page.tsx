// app/(protected)/admin/wallets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Wallet, 
  Search,
  ArrowDownRight,
  RefreshCw,
  Building,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'

interface WalletData {
  id: string
  balance: number
  pendingBalance: number
  totalEarned: number
  totalWithdrawn: number
  producer: {
    id: string
    userId: string
    companyName: string
    bankName: string | null
    bankAccountName: string | null
    iban: string | null
    bic: string | null
    user: {
      id: string
      name: string | null
      email: string
    }
  }
  pendingWithdrawals: number
}

export default function AdminWalletsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchWallets()
  }, [])

  const fetchWallets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/wallets')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des portefeuilles')
      }
      
      const data = await response.json()
      setWallets(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les portefeuilles des producteurs',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await fetchWallets()
    setIsRefreshing(false)
  }

  // Filtrer les portefeuilles selon la recherche
  const filteredWallets = wallets.filter(wallet => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    const producerName = wallet.producer.companyName?.toLowerCase() || ''
    const userName = wallet.producer.user.name?.toLowerCase() || ''
    const email = wallet.producer.user.email.toLowerCase()
    
    return producerName.includes(searchLower) || 
           userName.includes(searchLower) || 
           email.includes(searchLower)
  })

  // Formater les montants en CHF
  const formatCHF = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Gestion des portefeuilles</h1>
        <p className="text-muted-foreground">
          Gérez les soldes et demandes de retraits des producteurs
        </p>
      </div>
      
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un producteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-input rounded-md bg-background"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {/* Bouton de rafraîchissement */}
          <LoadingButton
            variant="outline"
            size="sm"
            onClick={refreshData}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </LoadingButton>
        </div>
      </div>
      
      {/* Résumé global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Producteurs</p>
              <p className="text-2xl font-semibold">{wallets.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
              <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total disponible</p>
              <p className="text-2xl font-semibold">
                {formatCHF(wallets.reduce((sum, wallet) => sum + wallet.balance, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Demandes en attente</p>
              <p className="text-2xl font-semibold">
                {wallets.reduce((sum, wallet) => sum + wallet.pendingWithdrawals, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des portefeuilles */}
      <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-foreground/10 bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Producteur</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Solde</th>
              <th className="px-4 py-3 text-right text-sm font-medium">En attente</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Demandes en cours</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Infos bancaires</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {filteredWallets.length > 0 ? (
              filteredWallets.map(wallet => (
                <tr key={wallet.id} className="hover:bg-muted/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{wallet.producer.companyName || "Entreprise sans nom"}</div>
                        <div className="text-sm text-muted-foreground">{wallet.producer.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium">{formatCHF(wallet.balance)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-muted-foreground">{formatCHF(wallet.pendingBalance)}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {wallet.pendingWithdrawals > 0 ? (
                      <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200">
                        {wallet.pendingWithdrawals}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {wallet.producer.iban ? (
                      <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurées
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Manquantes
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/wallets/${wallet.id}`}
                      className="inline-flex items-center text-custom-accent hover:underline"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Détails
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  {searchQuery ? "Aucun résultat ne correspond à votre recherche" : "Aucun portefeuille trouvé"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}