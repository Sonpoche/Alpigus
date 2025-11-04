// Chemin du fichier: components/admin/dashboard-stats.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  ShoppingBag, 
  Package, 
  DollarSign, 
  TrendingUp, 
  UserCheck,
  Clock,
  AlertCircle
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#000000', '#666666', '#999999', '#CCCCCC', '#4CAF50', '#2196F3', '#FFC107']
const PRODUCT_TYPE_COLORS: Record<string, string> = {
  FRESH: '#4CAF50',
  DRIED: '#FF9800',
  SUBSTRATE: '#2196F3',
  WELLNESS: '#9C27B0'
}

export default function DashboardStats() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#fff',
      border: '2px solid #000',
      borderRadius: '4px',
      color: '#000',
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    },
    itemStyle: {
      color: '#000',
    },
    labelStyle: {
      color: '#666',
      fontWeight: 'bold'
    }
  }

  const gridStyle = {
    stroke: '#e5e5e5',
  }

  const axisStyle = {
    tick: {
      fill: '#666',
    },
    line: {
      stroke: '#000',
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/stats')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
  }

  const prepareUserRoleChart = () => {
    if (!stats?.users?.byRole) return []
    
    return stats.users.byRole.map((role: any) => ({
      name: role.role === 'ADMIN' ? 'Administrateurs' : 
            role.role === 'PRODUCER' ? 'Producteurs' : 
            role.role === 'CLIENT' ? 'Clients' : role.role || 'Inconnu',
      value: role._count?.id || 0
    }))
  }
  
  const prepareProductTypesChart = () => {
    if (!stats?.products?.byType) return []
    
    return stats.products.byType.map((type: any) => ({
      name: type.type || 'Inconnu',
      value: type._count?.id || 0
    }))
  }
  
  const prepareOrdersByProductTypeChart = () => {
    if (!stats?.ordersByProductType) return []
    
    return stats.ordersByProductType.map((item: any) => ({
      name: item.type || 'Inconnu',
      value: typeof item.count === 'string' ? parseInt(item.count) : (item.count || 0)
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-4">Impossible de charger les statistiques</p>
        <LoadingButton onClick={handleRefresh} isLoading={refreshing}>
          Réessayer
        </LoadingButton>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header - RESPONSIVE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-3">
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8" />
            Tableau de bord
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Vue d'ensemble des statistiques</p>
        </div>
        <LoadingButton 
          onClick={handleRefresh} 
          isLoading={refreshing}
          className="bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Clock className="h-4 w-4" />
          Actualiser
        </LoadingButton>
      </div>

      {/* Cartes de statistiques principales - RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Utilisateurs</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-black truncate">{stats.users?.total || 0}</h3>
            </div>
            <div className="bg-blue-100 p-2 md:p-3 rounded-full border-2 border-blue-500 flex-shrink-0 ml-2">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-2 text-green-600 flex-shrink-0" />
            <span className="text-green-600 font-bold">{stats.users?.newUsers || 0}</span>
            <span className="text-gray-600 ml-1 truncate">nouveaux (30j)</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Commandes</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-black truncate">{stats.orders?.total || 0}</h3>
            </div>
            <div className="bg-purple-100 p-2 md:p-3 rounded-full border-2 border-purple-500 flex-shrink-0 ml-2">
              <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-2 text-green-600 flex-shrink-0" />
            <span className="text-green-600 font-bold">{stats.orders?.newOrders || 0}</span>
            <span className="text-gray-600 ml-1 truncate">récentes (30j)</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Produits</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-black truncate">{stats.products?.total || 0}</h3>
            </div>
            <div className="bg-green-100 p-2 md:p-3 rounded-full border-2 border-green-500 flex-shrink-0 ml-2">
              <Package className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex flex-wrap gap-1">
            {stats.products?.byType?.map((type: any, index: number) => (
              <div key={type.type || index} className="text-xs py-1 px-2 bg-gray-100 border border-gray-300 rounded-full font-medium whitespace-nowrap">
                {type.type}: {type._count?.id || 0}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 font-medium">Chiffre d'affaires</p>
              <h3 className="text-xl md:text-3xl font-bold mt-2 text-black truncate">{(stats.orders?.totalValue || 0).toFixed(2)} CHF</h3>
            </div>
            <div className="bg-yellow-100 p-2 md:p-3 rounded-full border-2 border-yellow-500 flex-shrink-0 ml-2">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 text-xs md:text-sm text-gray-600">
            Moyenne: <span className="font-bold text-black">{(stats.orders?.total || 0) > 0 
              ? ((stats.orders?.totalValue || 0) / stats.orders.total).toFixed(2) 
              : '0.00'} CHF</span> / commande
          </div>
        </div>
      </div>

      {/* Graphiques - CENTRAGE CORRIGÉ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Répartition des utilisateurs */}
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Répartition des utilisateurs par rôle</h3>
          {prepareUserRoleChart().length > 0 ? (
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prepareUserRoleChart()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius="60%"
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {prepareUserRoleChart().map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} utilisateurs`, 'Nombre']}
                    contentStyle={tooltipStyle.contentStyle}
                    itemStyle={tooltipStyle.itemStyle}
                    labelStyle={tooltipStyle.labelStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-72 w-full flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Commandes par type de produit */}
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Commandes par type de produit</h3>
          {prepareOrdersByProductTypeChart().length > 0 ? (
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepareOrdersByProductTypeChart()}
                  margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: axisStyle.tick.fill, fontSize: 11 }} 
                    stroke={axisStyle.line.stroke}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: axisStyle.tick.fill, fontSize: 11 }} 
                    stroke={axisStyle.line.stroke}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value} commandes`, 'Nombre']}
                    contentStyle={tooltipStyle.contentStyle}
                    itemStyle={tooltipStyle.itemStyle}
                    labelStyle={tooltipStyle.labelStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="value" name="Nombre de commandes">
                    {prepareOrdersByProductTypeChart().map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PRODUCT_TYPE_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-72 w-full flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Evolution des ventes */}
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Évolution des ventes</h3>
          {stats.salesByMonth && stats.salesByMonth.length > 0 ? (
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.salesByMonth}
                  margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: axisStyle.tick.fill, fontSize: 11 }} 
                    stroke={axisStyle.line.stroke}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: axisStyle.tick.fill, fontSize: 11 }} 
                    stroke={axisStyle.line.stroke}
                  />
                  <Tooltip 
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return [`${value.toFixed(2)} CHF`, 'Montant']
                      }
                      return [`${value}`, 'Montant']
                    }}
                    contentStyle={tooltipStyle.contentStyle}
                    itemStyle={tooltipStyle.itemStyle}
                    labelStyle={tooltipStyle.labelStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Chiffre d'affaires"
                    stroke="#000"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-72 w-full flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Produits les plus commandés */}
        <div className="bg-white border-2 border-black rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Produits les plus commandés</h3>
          {stats.products?.topProducts && stats.products.topProducts.length > 0 ? (
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.products.topProducts}
                  layout="vertical"
                  margin={{ top: 20, right: 20, left: 80, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: axisStyle.tick.fill, fontSize: 11 }} 
                    stroke={axisStyle.line.stroke} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 10, fill: axisStyle.tick.fill }}
                    stroke={axisStyle.line.stroke}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'totalQuantity') return [`${value} unités`, 'Quantité totale']
                      if (name === 'totalOrders') return [`${value}`, 'Nombre de commandes']
                      return [`${value}`, name]
                    }}
                    contentStyle={tooltipStyle.contentStyle}
                    itemStyle={tooltipStyle.itemStyle}
                    labelStyle={tooltipStyle.labelStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="totalQuantity" name="Quantité totale" fill="#000" />
                  <Bar dataKey="totalOrders" name="Nombre de commandes" fill="#666" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-72 w-full flex items-center justify-center">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableaux - RESPONSIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Produits les plus populaires */}
        <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b-2 border-black bg-gray-50">
            <h3 className="font-bold text-base md:text-lg">Produits les plus populaires</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-bold">Produit</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-bold">Type</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-bold">Cmd</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-bold">Qté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.products?.topProducts && stats.products.topProducts.length > 0 ? (
                  stats.products.topProducts.map((product: any, index: number) => (
                    <tr key={product.id || index} className="hover:bg-gray-50">
                      <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-black text-xs md:text-sm truncate max-w-[120px]">{product.name || 'Sans nom'}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 border border-gray-300 font-medium whitespace-nowrap">
                          {product.type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-right font-bold text-xs md:text-sm">
                        {product.totalOrders || 0}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm">
                        <span className="font-bold">{product.totalQuantity || 0}</span>
                        <span className="text-xs text-gray-600 ml-1">
                          {product.unit || 'u'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 md:px-4 py-8 md:py-12 text-center">
                      <Package className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                      <p className="text-sm md:text-base text-gray-600 font-medium">Aucun produit trouvé</p>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">Les produits apparaîtront ici</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statuts des commandes */}
        <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b-2 border-black bg-gray-50">
            <h3 className="font-bold text-base md:text-lg">Statuts des commandes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-bold">Statut</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-bold">Nombre</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-bold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.orders?.byStatus && stats.orders.byStatus.length > 0 ? (
                  stats.orders.byStatus.map((status: any, index: number) => {
                    const statusCount = status._count?.id || 0
                    const percentage = (stats.orders?.total || 0) > 0 
                      ? (statusCount / stats.orders.total * 100).toFixed(1) 
                      : '0.0'
                    
                    const statusTranslations: Record<string, string> = {
                      'PENDING': 'En attente',
                      'CONFIRMED': 'Confirmée',
                      'SHIPPED': 'Expédiée',
                      'DELIVERED': 'Livrée',
                      'CANCELLED': 'Annulée',
                      'INVOICE_PENDING': 'Facture en attente',
                      'INVOICE_PAID': 'Facture payée',
                      'INVOICE_OVERDUE': 'Facture en retard'
                    }
                    
                    const getBadgeClass = (status: string) => {
                      switch(status) {
                        case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500'
                        case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                        case 'SHIPPED': return 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                        case 'DELIVERED': return 'bg-green-100 text-green-800 border-2 border-green-500'
                        case 'CANCELLED': return 'bg-red-100 text-red-800 border-2 border-red-500'
                        case 'INVOICE_PENDING': return 'bg-orange-100 text-orange-800 border-2 border-orange-500'
                        case 'INVOICE_PAID': return 'bg-green-100 text-green-800 border-2 border-green-500'
                        case 'INVOICE_OVERDUE': return 'bg-red-100 text-red-800 border-2 border-red-500'
                        default: return 'bg-gray-100 text-gray-800 border-2 border-gray-500'
                      }
                    }
                    
                    return (
                      <tr key={status.status || index} className="hover:bg-gray-50">
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getBadgeClass(status.status)} whitespace-nowrap`}>
                            {statusTranslations[status.status] || status.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right font-bold text-xs md:text-sm">{statusCount}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm">
                          <span className="font-bold">{percentage}%</span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 md:px-4 py-8 md:py-12 text-center">
                      <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                      <p className="text-sm md:text-base text-gray-600 font-medium">Aucune commande</p>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">Les commandes apparaîtront ici</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Message d'aide - RESPONSIVE */}
      {(!stats.orders?.total || stats.orders.total === 0) && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 border-2 border-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 text-base md:text-lg mb-2">
                Aucune commande pour le moment
              </h3>
              <p className="text-xs md:text-sm text-blue-800 mb-3 md:mb-4">
                Les statistiques apparaîtront ici dès que les premières commandes seront passées sur votre plateforme. 
                En attendant, vous pouvez :
              </p>
              <ul className="text-xs md:text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  Vérifier que des produits sont disponibles
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  S'assurer que les producteurs ont configuré leurs créneaux de livraison
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">•</span>
                  Tester le processus de commande
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}