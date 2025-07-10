// components/admin/dashboard-stats.tsx - CORRECTION POUR LES PRODUITS POPULAIRES
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
  Clock
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useTheme } from 'next-themes'

// Couleurs pour les graphiques
const COLORS = ['#FF5A5F', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#3F51B5', '#00BCD4'];
const PRODUCT_TYPE_COLORS: Record<string, string> = {
  FRESH: '#4CAF50',
  DRIED: '#FF9800',
  SUBSTRATE: '#2196F3',
  WELLNESS: '#9C27B0'
};

export default function DashboardStats() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { resolvedTheme } = useTheme()

  // Styles pour les graphiques
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: resolvedTheme === 'dark' ? '#1a1a1a' : '#fff',
      border: resolvedTheme === 'dark' ? '1px solid #444' : '1px solid #ddd',
      borderRadius: '4px',
      color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333',
      boxShadow: resolvedTheme === 'dark' 
        ? '0 4px 10px rgba(0, 0, 0, 0.5)' 
        : '0 4px 10px rgba(0, 0, 0, 0.1)',
    },
    itemStyle: {
      color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333',
    },
    labelStyle: {
      color: resolvedTheme === 'dark' ? '#aaa' : '#666',
    }
  }

  const gridStyle = {
    stroke: resolvedTheme === 'dark' ? '#444' : '#eee',
  }

  const axisStyle = {
    tick: {
      fill: resolvedTheme === 'dark' ? '#aaa' : '#666',
    },
    line: {
      stroke: resolvedTheme === 'dark' ? '#444' : '#ddd',
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

  // Formater les données pour les graphiques
  const prepareUserRoleChart = () => {
    if (!stats?.users?.byRole) return []
    
    return stats.users.byRole.map((role: any) => ({
      name: role.role || 'Inconnu',
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Erreur de chargement</h3>
        <p className="text-muted-foreground mb-4">Impossible de charger les statistiques</p>
        <LoadingButton onClick={handleRefresh} isLoading={refreshing}>
          Réessayer
        </LoadingButton>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tableau de bord</h2>
        <LoadingButton 
          onClick={handleRefresh} 
          isLoading={refreshing}
          variant="outline"
          size="sm"
        >
          <Clock className="mr-2 h-4 w-4" />
          Actualiser les données
        </LoadingButton>
      </div>

      {/* ✅ DEBUG: Afficher les données brutes temporairement */}
      {process.env.NODE_ENV === 'development' && false && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-bold mb-2">DEBUG - Top Products:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(stats.products?.topProducts, null, 2)}
          </pre>
        </div>
      )}

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Utilisateurs</p>
              <h3 className="text-2xl font-bold mt-1">{stats.users?.total || 0}</h3>
            </div>
            <div className="bg-custom-accent/10 p-3 rounded-full">
              <Users className="h-6 w-6 text-custom-accent" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <UserCheck className="h-4 w-4 mr-1 text-green-500" />
            <span className="text-green-500 font-medium">{stats.users?.newUsers || 0}</span>
            <span className="text-muted-foreground ml-1">nouveaux (30j)</span>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Commandes</p>
              <h3 className="text-2xl font-bold mt-1">{stats.orders?.total || 0}</h3>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
            <span className="text-green-500 font-medium">{stats.orders?.newOrders || 0}</span>
            <span className="text-muted-foreground ml-1">récentes (30j)</span>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Produits</p>
              <h3 className="text-2xl font-bold mt-1">{stats.products?.total || 0}</h3>
            </div>
            <div className="bg-green-500/10 p-3 rounded-full">
              <Package className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1">
            {stats.products?.byType?.map((type: any, index: number) => (
              <div key={type.type || index} className="text-xs py-1 px-2 bg-foreground/5 rounded-full">
                {type.type}: {type._count?.id || 0}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              <h3 className="text-2xl font-bold mt-1">{(stats.orders?.totalValue || 0).toFixed(2)} CHF</h3>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Valeur moyenne: {(stats.orders?.total || 0) > 0 
              ? ((stats.orders?.totalValue || 0) / stats.orders.total).toFixed(2) 
              : '0.00'} CHF / commande
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition des utilisateurs par rôle */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Répartition des utilisateurs par rôle</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prepareUserRoleChart()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
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
                <Legend 
                  formatter={(value, entry) => {
                    const labels: Record<string, string> = {
                      'totalQuantity': 'Quantité totale',
                      'totalOrders': 'Nombre de commandes'
                    };
                    return (
                      <span style={{ color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333' }}>
                        {labels[value as string] || value}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commandes par type de produit */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Commandes par type de produit</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareOrdersByProductTypeChart()}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis dataKey="name" tick={{ fill: axisStyle.tick.fill }} stroke={axisStyle.line.stroke} />
                <YAxis tick={{ fill: axisStyle.tick.fill }} stroke={axisStyle.line.stroke} />
                <Tooltip 
                  formatter={(value: any) => [`${value} commandes`, 'Nombre']}
                  contentStyle={tooltipStyle.contentStyle}
                  itemStyle={tooltipStyle.itemStyle}
                  labelStyle={tooltipStyle.labelStyle}
                />
                <Legend 
                  formatter={(value, entry) => (
                    <span style={{ color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333' }}>
                      {value}
                    </span>
                  )}
                />
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
        </div>

        {/* Evolution des ventes par mois */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Évolution des ventes</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.salesByMonth || []}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis dataKey="month" tick={{ fill: axisStyle.tick.fill }} stroke={axisStyle.line.stroke} />
                <YAxis tick={{ fill: axisStyle.tick.fill }} stroke={axisStyle.line.stroke} />
                <Tooltip 
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return [`${value.toFixed(2)} CHF`, 'Montant'];
                    }
                    return [`${value}`, 'Montant'];
                  }}
                  contentStyle={tooltipStyle.contentStyle}
                  itemStyle={tooltipStyle.itemStyle}
                  labelStyle={tooltipStyle.labelStyle}
                />
                <Legend 
                  formatter={(value, entry) => (
                    <span style={{ color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333' }}>
                      {value}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Chiffre d'affaires"
                  stroke="#FF5A5F"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Produits les plus commandés */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Produits les plus commandés</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.products?.topProducts || []}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 120,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis type="number" tick={{ fill: axisStyle.tick.fill }} stroke={axisStyle.line.stroke} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 12, fill: axisStyle.tick.fill }}
                  stroke={axisStyle.line.stroke}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'totalQuantity') return [`${value} unités`, 'Quantité totale'];
                    if (name === 'totalOrders') return [`${value}`, 'Nombre de commandes'];
                    return [`${value}`, name];
                  }}
                  contentStyle={tooltipStyle.contentStyle}
                  itemStyle={tooltipStyle.itemStyle}
                  labelStyle={tooltipStyle.labelStyle}
                />
                <Legend 
                  formatter={(value, entry) => (
                    <span style={{ color: resolvedTheme === 'dark' ? '#f0f0f0' : '#333' }}>
                      {value}
                    </span>
                  )}
                />
                <Bar dataKey="totalQuantity" name="Quantité totale" fill="#FF5A5F" />
                <Bar dataKey="totalOrders" name="Nombre de commandes" fill="#2196F3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tableaux des récentes activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ CORRECTION: Top 5 des produits avec données corrigées */}
        <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-foreground/10">
            <h3 className="font-semibold">Produits les plus populaires</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-foreground/5">
                  <th className="px-4 py-3 text-left">Produit</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Commandes</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {stats.products?.topProducts && stats.products.topProducts.length > 0 ? (
                  stats.products.topProducts.map((product: any, index: number) => (
                    <tr key={product.id || index} className="hover:bg-foreground/5">
                      <td className="px-4 py-3 font-medium">{product.name || 'Sans nom'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-foreground/5">
                          {product.type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {product.totalOrders || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium">{product.totalQuantity || 0}</span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {product.unit || 'unités'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                        <p>Aucun produit trouvé</p>
                        <p className="text-xs">Les produits apparaîtront ici après les premières commandes</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statuts des commandes */}
        <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-foreground/10">
            <h3 className="font-semibold">Statuts des commandes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-foreground/5">
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Nombre</th>
                  <th className="px-4 py-3 text-right">Pourcentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {stats.orders?.byStatus && stats.orders.byStatus.length > 0 ? (
                  stats.orders.byStatus.map((status: any, index: number) => {
                    const statusCount = status._count?.id || 0;
                    const percentage = (stats.orders?.total || 0) > 0 
                      ? (statusCount / stats.orders.total * 100).toFixed(1) 
                      : '0.0';
                    
                    // Traduire les statuts en français
                    const statusTranslations: Record<string, string> = {
                      'PENDING': 'En attente',
                      'CONFIRMED': 'Confirmée',
                      'SHIPPED': 'Expédiée',
                      'DELIVERED': 'Livrée',
                      'CANCELLED': 'Annulée',
                      'INVOICE_PENDING': 'Facture en attente',
                      'INVOICE_PAID': 'Facture payée',
                      'INVOICE_OVERDUE': 'Facture en retard'
                    };
                    
                    const statusColor = (status: string) => {
                      switch(status) {
                        case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
                        case 'CONFIRMED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
                        case 'SHIPPED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
                        case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
                        case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
                        case 'INVOICE_PENDING': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
                        case 'INVOICE_PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
                        case 'INVOICE_OVERDUE': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
                        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
                      }
                    };
                    
                    return (
                      <tr key={status.status || index} className="hover:bg-foreground/5">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(status.status)}`}>
                            {statusTranslations[status.status] || status.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{statusCount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium">{percentage}%</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                        <p>Aucune commande trouvée</p>
                        <p className="text-xs">Les commandes apparaîtront ici après les premières ventes</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section d'aide si aucune donnée */}
      {(!stats.orders?.total || stats.orders.total === 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/40 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Aucune commande pour le moment
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Les statistiques apparaîtront ici dès que les premières commandes seront passées sur votre plateforme. 
                En attendant, vous pouvez :
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Vérifier que des produits sont disponibles</li>
                <li>• S'assurer que les producteurs ont configuré leurs créneaux de livraison</li>
                <li>• Tester le processus de commande</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}