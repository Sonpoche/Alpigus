// components/admin/orders-supervision.tsx (mise à jour)
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function OrdersSupervision() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [timePeriod, setTimePeriod] = useState(30) // jours
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)

  // Charger les données
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
    setCurrentPage(1) // Réinitialiser à la première page lors d'une recherche
    fetchData(searchTerm)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || (data?.pagination && page > data.pagination.pages)) return
    setCurrentPage(page)
  }

  // Fonction pour obtenir la couleur de badge en fonction du statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'CONFIRMED':
        return 'success'
      case 'SHIPPED':
        return 'info'
      case 'DELIVERED':
        return 'success'
      case 'CANCELLED':
        return 'destructive'
      case 'INVOICE_PENDING':
        return 'warning'
      case 'INVOICE_PAID':
        return 'success'
      case 'INVOICE_OVERDUE':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-500 mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
        <p className="text-muted-foreground mb-4">Impossible de charger les données de supervision</p>
        <LoadingButton onClick={handleRefresh} isLoading={refreshing}>
          Réessayer
        </LoadingButton>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supervision des commandes</h2>
        <div className="flex gap-4 items-center">
          <div>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(parseInt(e.target.value))}
              className="px-3 py-2 border border-foreground/10 rounded-md"
            >
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="365">12 derniers mois</option>
            </select>
          </div>
          <LoadingButton 
            onClick={handleRefresh} 
            isLoading={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser les données
          </LoadingButton>
        </div>
      </div>

      {/* Alertes et commandes nécessitant attention */}
      {data.ordersNeedingAttention && data.ordersNeedingAttention.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              {data.ordersNeedingAttention.length} commande(s) nécessitant votre attention
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800">
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">ID</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Client</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Total</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Statut</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Problème</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-amber-800 dark:text-amber-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.ordersNeedingAttention.map((order: any) => (
                  <tr key={order.id} className="border-b border-amber-100 dark:border-amber-800/30">
                    <td className="py-2 px-3 text-sm">{order.id.substring(0, 8)}</td>
                    <td className="py-2 px-3 text-sm">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      {order.customer ? order.customer.name : 'Client inconnu'}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      {order.total.toFixed(2)} CHF
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-sm">{order.issueType}</td>
                    <td className="py-2 px-3 text-sm text-right">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors inline-block"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recherche de commandes */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-foreground/10 flex justify-between items-center">
          <h3 className="font-semibold">Toutes les commandes</h3>
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 border border-input rounded-md"
              />
            </div>
            <Button 
              type="submit" 
              variant="outline" 
              size="sm" 
              className="ml-2"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                'Rechercher'
              )}
            </Button>
          </form>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-foreground/5">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-center">Articles</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {data.orders && data.orders.length > 0 ? (
                data.orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-foreground/5">
                    <td className="px-4 py-3 font-mono">{order.id.substring(0, 8)}</td>
                    <td className="px-4 py-3">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      {order.customer ? (
                        <div>
                          <div className="font-medium">{order.customer.name}</div>
                          <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Client inconnu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{order.items}</td>
                    <td className="px-4 py-3 text-right font-medium">{order.total.toFixed(2)} CHF</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="p-2 text-foreground/60 hover:text-custom-accent transition-colors inline-block"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-center text-muted-foreground">
                    {searchTerm ? "Aucune commande trouvée pour cette recherche" : "Aucune commande trouvée pour cette période"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/10">
            <div className="text-sm text-muted-foreground">
              Affichage de {(data.pagination.page - 1) * data.pagination.limit + 1} à {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} sur {data.pagination.total} commandes
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {[...Array(data.pagination.pages)].map((_, index) => {
                const pageNumber = index + 1;
                // Afficher seulement quelques pages autour de la page actuelle
                if (
                  pageNumber === 1 || 
                  pageNumber === data.pagination.pages || 
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="min-w-[32px]"
                    >
                      {pageNumber}
                    </Button>
                  );
                } else if (
                  (pageNumber === currentPage - 2 && currentPage > 3) || 
                  (pageNumber === currentPage + 2 && currentPage < data.pagination.pages - 2)
                ) {
                  return <span key={pageNumber}>...</span>;
                }
                return null;
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={data.pagination && currentPage >= data.pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques par statut */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm p-6">
        <h3 className="font-semibold mb-4">Statuts des commandes</h3>
        <div className="space-y-4">
          {data.overview.ordersByStatus.map((status: any) => (
            <div key={status.status} className="flex items-center justify-between">
              <div className="flex items-center">
                <Badge variant={getStatusBadgeVariant(status.status)} className="mr-2">
                  {status.status}
                </Badge>
                <span className="text-sm">{status._count.id} commande(s)</span>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full",
                      status.status === 'DELIVERED' || status.status === 'INVOICE_PAID' 
                        ? "bg-green-500" 
                        : status.status === 'CANCELLED' || status.status === 'INVOICE_OVERDUE'
                          ? "bg-red-500"
                          : "bg-custom-accent"
                    )}
                    style={{ 
                      width: `${(status._count.id / data.overview.totalOrders) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium">
                {((status._count.id / data.overview.totalOrders) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}