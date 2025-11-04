// Chemin du fichier: components/admin/orders-supervision.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OrdersSupervision() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [timePeriod, setTimePeriod] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    fetchData()
  }, [timePeriod, currentPage])

  const fetchData = async (search?: string) => {
    try {
      setIsLoading(true)
      const searchParam = search !== undefined ? search : searchTerm
      
      const url = new URL(`/api/admin/orders/overview`, window.location.origin)
      url.searchParams.append('days', timePeriod.toString())
      url.searchParams.append('page', currentPage.toString())
      url.searchParams.append('limit', '10')
      
      if (searchParam) {
        url.searchParams.append('search', searchParam)
      }
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données')
      }
      
      const responseData = await response.json()
      setData(responseData)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de supervision",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setCurrentPage(1)
    fetchData(searchTerm)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || (data?.pagination && page > data.pagination.pages)) return
    setCurrentPage(page)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'PENDING': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-800' },
      'CONFIRMED': { label: 'Confirmée', className: 'bg-blue-100 text-blue-800 border-2 border-blue-800' },
      'SHIPPED': { label: 'Expédiée', className: 'bg-purple-100 text-purple-800 border-2 border-purple-800' },
      'DELIVERED': { label: 'Livrée', className: 'bg-green-100 text-green-800 border-2 border-green-800' },
      'CANCELLED': { label: 'Annulée', className: 'bg-red-100 text-red-800 border-2 border-red-800' },
      'INVOICE_PENDING': { label: 'Facture en attente', className: 'bg-orange-100 text-orange-800 border-2 border-orange-800' },
      'INVOICE_PAID': { label: 'Facture payée', className: 'bg-green-100 text-green-800 border-2 border-green-800' },
      'INVOICE_OVERDUE': { label: 'Facture en retard', className: 'bg-red-100 text-red-800 border-2 border-red-800' }
    }
    
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-2 border-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${badge.className} whitespace-nowrap`}>
        {badge.label}
      </span>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-4">Impossible de charger les données de supervision</p>
        <LoadingButton onClick={handleRefresh} isLoading={refreshing}>
          Réessayer
        </LoadingButton>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - RESPONSIVE avec SELECT et BUTTON alignés */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-3">
              <Package className="h-6 w-6 md:h-8 md:w-8" />
              Supervision des commandes
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {data.pagination?.total || 0} commande{(data.pagination?.total || 0) > 1 ? 's' : ''} au total
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Select avec chevron personnalisé */}
            <div className="relative">
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(parseInt(e.target.value))}
                className="w-full sm:w-auto appearance-none px-4 py-2.5 pr-10 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none font-medium text-sm bg-white cursor-pointer"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="365">12 derniers mois</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            </div>
            
            {/* Bouton avec même hauteur */}
            <LoadingButton 
              onClick={handleRefresh} 
              isLoading={refreshing}
              className="w-full sm:w-auto bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 text-sm h-[42px]"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Alertes - RESPONSIVE */}
      {data.ordersNeedingAttention && data.ordersNeedingAttention.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 md:p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 mr-3 flex-shrink-0" />
            <h3 className="font-bold text-yellow-900 text-sm md:text-lg">
              {data.ordersNeedingAttention.length} commande{data.ordersNeedingAttention.length > 1 ? 's' : ''} nécessitant votre attention
            </h3>
          </div>
          
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[600px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-yellow-500">
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">ID</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Date</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Client</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Total</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Statut</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Problème</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold text-yellow-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordersNeedingAttention.map((order: any) => (
                    <tr key={order.id} className="border-b border-yellow-300">
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-mono">{order.id.substring(0, 8)}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium truncate max-w-[100px]">
                        {order.customer ? order.customer.name : 'Client inconnu'}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-bold">
                        {order.total.toFixed(2)} CHF
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-yellow-900 truncate max-w-[120px]">{order.issueType}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                        <Link 
                          href={`/admin/orders/${order.id}`}
                          className="inline-block p-2 hover:bg-yellow-100 rounded-md transition-colors border-2 border-black"
                        >
                          <Eye className="h-4 w-4 text-black" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg p-3 md:p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none text-sm"
            />
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto px-4 md:px-6 py-2 bg-black text-white border-2 border-black rounded-md hover:bg-gray-800 transition-colors font-semibold text-sm disabled:opacity-50"
            disabled={isSearching}
          >
            {isSearching ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>
      </div>

      {/* Liste des commandes - RESPONSIVE */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black">ID</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black">Date</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-black">Client</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-bold text-black">Articles</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-black">Total</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-bold text-black">Statut</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.orders && data.orders.length > 0 ? (
                  data.orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-xs md:text-sm">{order.id.substring(0, 8)}</td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {order.customer ? (
                          <div>
                            <div className="font-semibold text-black text-xs md:text-sm truncate max-w-[150px]">{order.customer.name}</div>
                            <div className="text-xs text-gray-600 truncate max-w-[150px]">
                              {order.customer.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs md:text-sm">Client inconnu</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-gray-100 text-black font-bold rounded-full border-2 border-gray-300 text-xs md:text-sm">
                          {order.items}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-right font-bold text-black text-xs md:text-sm">
                        {order.total.toFixed(2)} CHF
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                        <Link 
                          href={`/admin/orders/${order.id}`}
                          className="inline-block p-2 hover:bg-gray-100 rounded-md transition-colors border-2 border-black"
                        >
                          <Eye className="h-4 w-4 text-black" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm md:text-base text-gray-600 font-medium">
                        {searchTerm ? 
                          "Aucune commande trouvée pour cette recherche" : 
                          "Aucune commande trouvée pour cette période"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination - RESPONSIVE */}
        {data.pagination && data.pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 py-3 md:py-4 border-t-2 border-black bg-gray-50 gap-3">
            <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
              Page {currentPage} sur {data.pagination.pages} ({data.pagination.total} commandes)
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 md:px-4 py-2 border-2 border-black rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 text-xs md:text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= data.pagination.pages}
                className="px-3 md:px-4 py-2 bg-black text-white border-2 border-black rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques des statuts - RESPONSIVE */}
      {data.statusStats && (
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-black mb-4">Statistiques des statuts</h3>
          <div className="space-y-3 md:space-y-4">
            {data.statusStats.map((stat: any) => (
              <div key={stat.status} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge(stat.status)}
                  <span className="text-xs md:text-sm font-medium">{stat.count} commande{stat.count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 sm:w-24 md:w-32 bg-gray-200 rounded-full h-2 border-2 border-gray-300">
                    <div 
                      className="h-full rounded-full bg-black"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs md:text-sm font-bold min-w-[50px] text-right">
                    {stat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}