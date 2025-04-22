// app/(protected)/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, 
  Clock, 
  Package, 
  ShoppingBag, 
  Download,
  Filter,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react'
import { formatDateToFrench } from '@/lib/date-utils'
import { OrderStatus, ProductType } from '@prisma/client'
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'

interface ReportsData {
  spendingByMonth: { month: string, amount: number }[]
  spendingByCategory: { category: string, amount: number }[]
  recentOrders: {
    id: string
    date: string
    items: number
    total: number
    status: OrderStatus
  }[]
  totalStats: {
    totalOrders: number
    totalSpent: number
    totalItems: number
    averageOrderValue: number
  }
}

export default function ClientReportsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    if (session?.user) {
      fetchReports(timeRange)
    }
  }, [session, timeRange])

  const fetchReports = async (range: 'month' | 'quarter' | 'year') => {
    setIsLoading(true)
    try {
      // Appel à l'API réelle
      const response = await fetch(`/api/client/reports?range=${range}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des rapports')
      }
      
      const data = await response.json()
      setReportsData(data)
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les rapports',
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

  // Colors for the pie chart
  const COLORS = ['#FF5A5F', '#36A2EB', '#FFCE56', '#4BC0C0'];

  const getOrderStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING: return 'En attente'
      case OrderStatus.CONFIRMED: return 'Confirmée'
      case OrderStatus.SHIPPED: return 'Expédiée'
      case OrderStatus.DELIVERED: return 'Livrée'
      case OrderStatus.CANCELLED: return 'Annulée'
      default: return status
    }
  }

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
        <h1 className="text-3xl font-bold mb-2">Mes rapports d'achat</h1>
        <p className="text-muted-foreground">
          Suivez vos dépenses et consultez l'historique de vos commandes
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
      {reportsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total des dépenses */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total dépensé</p>
                <p className="text-3xl font-bold mt-1">{formatCHF(reportsData.totalStats.totalSpent)}</p>
              </div>
              <div className="p-2 bg-custom-accentLight rounded-full">
                <ShoppingBag className="h-5 w-5 text-custom-accent" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Sur {timeRange === 'month' ? '6' : timeRange === 'quarter' ? '12' : '24'} mois
              </span>
            </div>
          </div>
          
          {/* Nombre de commandes */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Commandes passées</p>
                <p className="text-3xl font-bold mt-1">{reportsData.totalStats.totalOrders}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {(reportsData.totalStats.totalOrders / (timeRange === 'month' ? 6 : timeRange === 'quarter' ? 12 : 24)).toFixed(1)} commandes par mois
              </span>
            </div>
          </div>
          
          {/* Articles achetés */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Articles achetés</p>
                <p className="text-3xl font-bold mt-1">{reportsData.totalStats.totalItems}</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {(reportsData.totalStats.totalItems / reportsData.totalStats.totalOrders).toFixed(1)} articles par commande
              </span>
            </div>
          </div>
          
          {/* Valeur moyenne des commandes */}
          <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-3xl font-bold mt-1">{formatCHF(reportsData.totalStats.averageOrderValue)}</p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <ShoppingBag className="h-5 w-5 text-green-600 dark:text-green-400" />
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
        {/* Graphique d'évolution des dépenses */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-custom-accent" />
            Évolution des dépenses
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportsData?.spendingByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Dépenses (CHF)"
                  stroke="#FF5A5F" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique de dépenses par catégorie */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-custom-accent" />
            Répartition des dépenses
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportsData?.spendingByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="category"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reportsData?.spendingByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCHF(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Tableau des commandes récentes */}
      {reportsData && (
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-custom-accent" />
            Commandes récentes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="border-b border-foreground/10">
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">N° commande</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Articles</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Statut</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-foreground/5">
                    <td className="py-3 px-4">
                      <span className="font-medium">{order.id}</span>
                    </td>
                    <td className="py-3 px-4">{formatDateToFrench(new Date(order.date))}</td>
                    <td className="py-3 px-4 text-center">{order.items}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        order.status === OrderStatus.PENDING ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" :
                        order.status === OrderStatus.CONFIRMED ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" :
                        order.status === OrderStatus.SHIPPED ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" :
                        order.status === OrderStatus.DELIVERED ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" :
                        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      )}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCHF(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Lien vers toutes les commandes */}
          <div className="mt-4 text-right">
            <a href="/orders" className="text-sm text-custom-accent hover:underline flex items-center justify-end">
              Voir toutes les commandes
            </a>
          </div>
        </div>
      )}
    </div>
  )
}