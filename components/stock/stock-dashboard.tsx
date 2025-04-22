// components/stock/stock-dashboard.tsx
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowDown, ArrowUp, Hourglass } from 'lucide-react'

interface StockDashboardProps {
  productId: string
  productUnit: string
}

interface StockRecord {
  id: string
  quantity: number
  date: string
  type: string
}

interface StockData {
  history: StockRecord[]
  currentStock: number
  weeklyRate: number
  daysUntilEmpty: number | null
}

export default function StockDashboard({ productId, productUnit }: StockDashboardProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stockData, setStockData] = useState<StockData | null>(null)

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${productId}/stock-history`)
        if (!response.ok) throw new Error("Erreur lors du chargement des données")
        
        const data = await response.json()
        setStockData(data)
      } catch (error) {
        console.error("Erreur:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de stock",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStockData()
  }, [productId, toast])

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!stockData) {
    return (
      <div className="p-6 text-center">
        <p>Aucune donnée de stock disponible</p>
      </div>
    )
  }

  // Préparation des données pour le graphique
  const chartData = stockData.history.map(record => ({
    date: new Date(record.date).toLocaleDateString(),
    stock: record.quantity,
    type: record.type
  }));

  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-6">Analyse des stocks</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-foreground/5 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Stock actuel</h3>
          <p className="text-2xl font-semibold">{stockData.currentStock} {productUnit}</p>
        </div>
        
        <div className="bg-foreground/5 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Écoulement hebdomadaire</h3>
          <div className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-red-500" />
            <p className="text-2xl font-semibold">{stockData.weeklyRate.toFixed(1)} {productUnit}/sem</p>
          </div>
        </div>
        
        <div className="bg-foreground/5 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Jours avant rupture</h3>
          <div className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-amber-500" />
            <p className="text-2xl font-semibold">
              {stockData.daysUntilEmpty !== null 
                ? `${stockData.daysUntilEmpty} jours` 
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
      
      <div className="h-80 mb-6">
        <h3 className="text-sm font-medium mb-4">Évolution du stock</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="stock" 
              stroke="#FF5A5F"
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}