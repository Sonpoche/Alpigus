// app/(protected)/producer/stats/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { 
  BarChart, 
  Calendar, 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Filter
} from 'lucide-react'
import { formatDateToFrench } from '@/lib/date-utils'
import { OrderStatus, ProductType } from '@prisma/client'
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'

interface StatsData {
  revenueByMonth: { month: string, revenue: number }[]
  revenueByProductType: { type: ProductType, revenue: number }[]
  topProducts: { id: string, name: string, revenue: number, quantity: number }[]
  totalStats: {
    totalOrders: number
    totalRevenue: number
    totalProductsSold: number
    averageOrderValue: number
    comparedToPreviousPeriod: {
      revenue: number
      orders: number
    }
  }
}

export default function ProducerStatsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    if (session?.user) {
      fetchStats(timeRange)
    }
  }, [session, timeRange])

  const fetchStats = async (range: 'month' | 'quarter' | 'year') => {
    setIsLoading(true)
    try {
      // Modifier cette ligne pour ajouter le "s" à producers
      const response = await fetch(`/api/producers/stats?range=${range}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }
      
      const data = await response.json()
      setStatsData(data)
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCHF = (value: number) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(value)
  }

  // Fonction pour formatter les tooltips des graphiques
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-foreground/10 p-3 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-custom-accent">
            {formatCHF(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Couleurs pour les graphiques
  const COLORS = ['#FF5A5F', '#36A2EB', '#FFCE56', '#4BC0C0'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Statistiques des ventes</h1>
        <p className="text-muted-foreground">
          Analysez vos performances de vente et vos revenus
        </p>
      </div>
      
      {/* Sélecteur de plage de temps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 bg-foreground/5 p-1 rounded-lg">
          <button
            onClick={() => setTimeRange('month')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              timeRange === 'month' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
            )}
          >
            6 derniers mois
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              timeRange === 'quarter' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
            )}
          >
            12 derniers mois
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              timeRange === 'year' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
            )}
          >
            2 dernières années
          </button>
        </div>
        
        <button className="flex items-center gap-2 text-sm font-medium px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors">
          <Download className="h-4 w-4" />
          Exporter en CSV
        </button>
      </div>
      
      {/* Cartes de statistiques principales */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total des revenus */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Revenu total</p>
                <p className="text-3xl font-bold mt-1">{formatCHF(statsData.totalStats.totalRevenue)}</p>
              </div>
              <div className={`p-2 rounded-full ${statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                {statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : (
                  <ArrowDownRight className="h-5 w-5" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? '+' : ''}
                {statsData.totalStats.comparedToPreviousPeriod.revenue}% 
              </span>
              <span className="text-sm text-muted-foreground ml-1">vs période précédente</span>
            </div>
          </div>
          
          {/* Nombre de commandes */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-3xl font-bold mt-1">{statsData.totalStats.totalOrders}</p>
              </div>
              <div className={`p-2 rounded-full ${statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                {statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : (
                  <ArrowDownRight className="h-5 w-5" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? '+' : ''}
                {statsData.totalStats.comparedToPreviousPeriod.orders}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">vs période précédente</span>
            </div>
          </div>
          
          {/* Produits vendus */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Produits vendus</p>
                <p className="text-3xl font-bold mt-1">{statsData.totalStats.totalProductsSold}</p>
              </div>
              <div className="p-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {Math.round(statsData.totalStats.totalProductsSold / (timeRange === 'month' ? 6 : timeRange === 'quarter' ? 12 : 24))} par mois en moyenne
              </span>
            </div>
          </div>
          
          {/* Valeur moyenne des commandes */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-3xl font-bold mt-1">{formatCHF(statsData.totalStats.averageOrderValue)}</p>
              </div>
              <div className="p-2 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded-full">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Par commande
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Graphique d'évolution des revenus */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-custom-accent" />
            Évolution des revenus
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsData?.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenu (CHF)"
                  stroke="#FF5A5F" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique de revenus par type de produit */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart className="h-5 w-5 text-custom-accent" />
            Revenus par type de produit
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={statsData?.revenueByProductType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  name="Revenu (CHF)"
                  fill="#FF5A5F" 
                >
                  {statsData?.revenueByProductType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Tableau des meilleurs produits */}
      {statsData && (
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-custom-accent" />
            Produits les plus vendus
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Quantité vendue</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Revenu</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">% du total</th>
                </tr>
              </thead>
              <tbody>
                {statsData.topProducts.map((product, index) => (
                  <tr key={product.id} className="border-b border-foreground/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full ${
                          index < 3 ? 'bg-custom-accent text-white' : 'bg-foreground/10'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">{product.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCHF(product.revenue)}</td>
                    <td className="py-3 px-4 text-right">
                      {Math.round((product.revenue / statsData.totalStats.totalRevenue) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}