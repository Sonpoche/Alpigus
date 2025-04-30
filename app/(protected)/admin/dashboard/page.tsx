// app/(protected)/admin/dashboard/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import DashboardStats from '@/components/admin/dashboard-stats'
import DashboardChart from '@/components/admin/dashboard-chart'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  DownloadCloud,
  RefreshCw
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'

export default function AdminDashboardPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Charger les statistiques
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
    
    toast({
      title: "Mise à jour terminée",
      description: "Les statistiques ont été actualisées"
    })
  }

  // Fonction pour exporter les statistiques en CSV
  const exportStats = () => {
    if (!stats) return
    
    try {
      // Préparer les données pour l'export
      const usersByRole = stats.users.byRole.reduce((acc: any, curr: any) => {
        acc[curr.role] = curr._count.id
        return acc
      }, {})
      
      const productsByType = stats.products.byType.reduce((acc: any, curr: any) => {
        acc[curr.type] = curr._count.id
        return acc
      }, {})
      
      const ordersByStatus = stats.orders.byStatus.reduce((acc: any, curr: any) => {
        acc[curr.status] = curr._count.id
        return acc
      }, {})
      
      // Créer l'objet de données à exporter
      const exportData = {
        "Statistiques générales": {
          "Total utilisateurs": stats.users.total,
          "Nouveaux utilisateurs (30j)": stats.users.newUsers,
          "Total commandes": stats.orders.total,
          "Nouvelles commandes (30j)": stats.orders.newOrders,
          "Total produits": stats.products.total,
          "Chiffre d'affaires total": stats.orders.totalValue
        },
        "Utilisateurs par rôle": usersByRole,
        "Produits par type": productsByType,
        "Commandes par statut": ordersByStatus,
        "Ventes mensuelles": stats.salesByMonth.reduce((acc: any, curr: any) => {
          acc[curr.month] = curr.value
          return acc
        }, {})
      }
      
      // Convertir en CSV
      let csv = 'Catégorie,Clé,Valeur\n'
      
      Object.entries(exportData).forEach(([category, data]: [string, any]) => {
        Object.entries(data).forEach(([key, value]) => {
          csv += `"${category}","${key}","${value}"\n`
        })
      })
      
      // Créer un lien de téléchargement
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `statistiques_admin_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export réussi",
        description: "Les statistiques ont été exportées au format CSV"
      })
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les statistiques",
        variant: "destructive"
      })
    }
  }

  // Préparer les données pour les graphiques
  const prepareUserRoleChart = () => {
    if (!stats?.users?.byRole) return []
    
    return stats.users.byRole.map((role: any) => ({
      name: role.role,
      value: role._count.id
    }))
  }
  
  const prepareProductTypesChart = () => {
    if (!stats?.products?.byType) return []
    
    return stats.products.byType.map((type: any) => ({
      name: type.type,
      value: type._count.id
    }))
  }
  
  const prepareOrdersByProductTypeChart = () => {
    if (!stats?.ordersByProductType) return []
    
    return stats.ordersByProductType.map((item: any) => ({
      name: item.type,
      value: parseInt(item.count)
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tableau de bord administrateur</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour: {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <LoadingButton 
            onClick={handleRefresh} 
            isLoading={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </LoadingButton>
          <LoadingButton 
            onClick={exportStats} 
            variant="outline"
            size="sm"
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            Exporter
          </LoadingButton>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <DashboardStats />
        </TabsContent>
        
        <TabsContent value="users">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardChart
                id="userRoles"
                title="Répartition des utilisateurs par rôle"
                data={prepareUserRoleChart()}
                type="pie"
                dataKey="value"
                nameKey="name"
                height={300}
                colors={['#FF5A5F', '#2196F3', '#4CAF50']}
              />
              
              <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Détails des utilisateurs</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-foreground/10">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold">{stats.users.total}</span>
                  </div>
                  
                  {stats.users.byRole.map((role: any) => (
                    <div key={role.role} className="flex justify-between items-center">
                      <span>{role.role}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{role._count.id}</span>
                        <div className="w-24 bg-foreground/10 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-custom-accent" 
                            style={{ width: `${(role._count.id / stats.users.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {((role._count.id / stats.users.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-foreground/10 text-green-500">
                    <span>Nouveaux (30j)</span>
                    <span className="font-medium">{stats.users.newUsers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="orders">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardChart
                id="ordersByType"
                title="Commandes par type de produit"
                data={prepareOrdersByProductTypeChart()}
                type="bar"
                dataKey="value"
                xAxisKey="name"
                height={300}
                colors={['#FF5A5F', '#2196F3', '#4CAF50', '#FFC107']}
              />
              
              <DashboardChart
                id="salesByMonth"
                title="Évolution des ventes mensuelles"
                data={stats?.salesByMonth || []}
                type="line"
                dataKey="value"
                xAxisKey="month"
                height={300}
                colors={['#FF5A5F']}
              />
            </div>
            
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
                      <th className="px-4 py-3 text-left">Visualisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/10">
                    {stats.orders.byStatus.map((status: any) => (
                      <tr key={status.status} className="hover:bg-foreground/5">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs bg-foreground/5">
                            {status.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{status._count.id}</td>
                        <td className="px-4 py-3 text-right">
                          {((status._count.id / stats.orders.total) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-full bg-foreground/10 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-custom-accent" 
                              style={{ width: `${(status._count.id / stats.orders.total) * 100}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="products">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardChart
                id="productTypes"
                title="Répartition des produits par type"
                data={prepareProductTypesChart()}
                type="pie"
                dataKey="value"
                nameKey="name"
                height={300}
                colors={['#4CAF50', '#FF9800', '#2196F3', '#9C27B0']}
              />
              
              <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-foreground/10">
                  <h3 className="font-semibold">Produits les plus commandés</h3>
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
                      {stats.products.topProducts.map((product: any) => (
                        <tr key={product.id} className="hover:bg-foreground/5">
                          <td className="px-4 py-3">{product.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-foreground/5">
                              {product.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{product.totalOrders}</td>
                          <td className="px-4 py-3 text-right">
                            {product.totalQuantity} {product.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}