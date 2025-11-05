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
import { formatPrice } from '@/lib/number-utils'
import { OrderStatus, ProductType } from '@prisma/client'
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { cn, containerClasses, gridClasses, cardClasses, spacingClasses } from '@/lib/utils'
import { motion } from 'framer-motion'

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
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchStats(timeRange)
    }
  }, [session, timeRange])

  const fetchStats = async (range: 'month' | 'quarter' | 'year') => {
    setIsLoading(true)
    try {
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

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const response = await fetch(`/api/producers/stats/export?range=${timeRange}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `statistiques-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Export réussi',
        description: 'Les statistiques ont été exportées avec succès'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les statistiques',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Fonction pour formatter les tooltips des graphiques
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-foreground/10 p-3 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-custom-accent">
            {formatPrice(payload[0].value)}
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
      <div className="flex justify-center items-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-custom-accent"></div>
      </div>
    )
  }

  return (
    <div className={containerClasses("py-8")}>
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-custom-title">
          Statistiques des ventes
        </h1>
        <p className="text-custom-text">
          Analysez vos performances de vente et vos revenus
        </p>
      </div>
      
      {/* Sélecteur de plage de temps et export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-lg sm:w-auto overflow-x-auto">
            <button
              onClick={() => setTimeRange('month')}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                timeRange === 'month' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
              )}
            >
              6 mois
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                timeRange === 'quarter' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
              )}
            >
              12 mois
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                timeRange === 'year' ? "bg-custom-accent text-white" : "hover:bg-foreground/10"
              )}
            >
              2 dernières années
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-r-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? 'Export...' : 'Exporter en CSV'}
        </button>
      </div>
      
      {/* Cartes de statistiques principales */}
      {statsData && (
        <div className={gridClasses({ default: 1, sm: 2, lg: 4 }, "mb-8")}>
          {/* Total des revenus */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cardClasses()}
          >
            <div className={spacingClasses('md')}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Revenu total</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-custom-title truncate">
                    {formatPrice(statsData.totalStats.totalRevenue)}
                  </p>
                </div>
                <div className={`p-2 rounded-full flex-shrink-0 ml-2 ${
                  statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-sm ${
                  statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {statsData.totalStats.comparedToPreviousPeriod.revenue >= 0 ? '+' : ''}
                  {statsData.totalStats.comparedToPreviousPeriod.revenue}%
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs période précédente</span>
              </div>
            </div>
          </motion.div>
          
          {/* Nombre de commandes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cardClasses()}
          >
            <div className={spacingClasses('md')}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Commandes</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-custom-title">
                    {statsData.totalStats.totalOrders}
                  </p>
                </div>
                <div className={`p-2 rounded-full flex-shrink-0 ml-2 ${
                  statsData.totalStats.comparedToPreviousPeriod.orders >= 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-sm ${
                  statsData.totalStats.comparedToPreviousPeriod.orders >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {statsData.totalStats.comparedToPreviousPeriod.orders >= 0 ? '+' : ''}
                  {statsData.totalStats.comparedToPreviousPeriod.orders}%
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs période précédente</span>
              </div>
            </div>
          </motion.div>
          
          {/* Produits vendus */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cardClasses()}
          >
            <div className={spacingClasses('md')}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Produits vendus</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-custom-title">
                    {statsData.totalStats.totalProductsSold}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full flex-shrink-0 ml-2">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  {Math.round(statsData.totalStats.totalProductsSold / (timeRange === 'month' ? 6 : timeRange === 'quarter' ? 12 : 24))} par mois en moyenne
                </span>
              </div>
            </div>
          </motion.div>
          
          {/* Valeur moyenne des commandes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={cardClasses()}
          >
            <div className={spacingClasses('md')}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Panier moyen</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-custom-title truncate">
                    {formatPrice(statsData.totalStats.averageOrderValue)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded-full flex-shrink-0 ml-2">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  Par commande
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Graphiques */}
      <div className={gridClasses({ default: 1, lg: 2 }, "mb-8")}>
        {/* Graphique d'évolution des revenus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={cardClasses()}
        >
          <div className={spacingClasses('md')}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-custom-title">
              <TrendingUp className="h-5 w-5 text-custom-accent" />
              Évolution des revenus
            </h2>
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statsData?.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
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
        </motion.div>
        
        {/* Graphique de revenus par type de produit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={cardClasses()}
        >
          <div className={spacingClasses('md')}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-custom-title">
              <BarChart className="h-5 w-5 text-custom-accent" />
              Revenus par type de produit
            </h2>
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={statsData?.revenueByProductType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="type" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
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
        </motion.div>
      </div>
      
      {/* Tableau des meilleurs produits - Version mobile améliorée */}
        {statsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={cardClasses()}
          >
            <div className={spacingClasses('md')}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-custom-title">
                <TrendingUp className="h-5 w-5 text-custom-accent" />
                Produits les plus vendus
              </h2>
              
              {/* Version desktop - tableau classique */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground/10">
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Produit
                      </th>
                      <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">
                        Quantité vendue
                      </th>
                      <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">
                        Revenu
                      </th>
                      <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">
                        % du total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.topProducts.map((product, index) => (
                      <tr key={product.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                              index < 3 ? 'bg-custom-accent text-white' : 'bg-foreground/10 text-foreground/70'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium text-custom-title">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-custom-text">
                          {product.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-custom-title">
                          {formatPrice(product.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-custom-text">
                          {Math.round((product.revenue / statsData.totalStats.totalRevenue) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Version mobile/tablette - cartes en colonne */}
              <div className="md:hidden space-y-3">
                {statsData.topProducts.map((product, index) => (
                  <div key={product.id} className="bg-foreground/5 rounded-lg p-4 border border-foreground/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium flex-shrink-0 ${
                          index < 3 ? 'bg-custom-accent text-white' : 'bg-foreground/20 text-foreground/70'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-custom-title truncate">{product.name}</h3>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Quantité</span>
                        <span className="font-medium text-custom-title">{product.quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">% du total</span>
                        <span className="font-medium text-custom-title">
                          {Math.round((product.revenue / statsData.totalStats.totalRevenue) * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-foreground/10">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Revenu</span>
                        <span className="text-lg font-bold text-custom-accent">
                          {formatPrice(product.revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          )}
    </div>
  )
}