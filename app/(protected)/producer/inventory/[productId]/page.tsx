// app/(protected)/producer/inventory/[productId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Package, ChevronLeft, BarChart2, Calendar, Bell } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StockAlertConfig from '@/components/stock/stock-alert-config'
import StockDashboard from '@/components/stock/stock-dashboard'
import ProductionSchedule from '@/components/stock/production-schedule'

interface PageProps {
  params: {
    productId: string
  }
}

interface Product {
  id: string
  name: string
  description: string
  type: string
  unit: string
  stock: {
    quantity: number
  } | null
}

export default function ProductInventoryPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${params.productId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/producer')
            return
          }
          throw new Error('Erreur lors du chargement du produit')
        }
        
        const data = await response.json()
        setProduct(data)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: 'Erreur',
          description: "Impossible de charger les données du produit",
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProduct()
  }, [params.productId, router, toast])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p>Produit non trouvé</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-montserrat font-bold text-custom-title">
              Gestion du stock : {product.name}
            </h1>
            <p className="text-muted-foreground">
              Consultez, analysez et planifiez vos stocks
            </p>
          </div>
        </div>
        
        {/* Aperçu du stock actuel */}
        <div className="bg-foreground/5 p-6 rounded-lg mb-8 flex items-center gap-6">
          <div className="p-4 bg-background rounded-full">
            <Package className="h-8 w-8 text-custom-accent" />
          </div>
          <div>
            <h2 className="font-medium mb-1">Stock actuel</h2>
            <p className="text-3xl font-semibold">
              {product.stock?.quantity || 0} {product.unit}
            </p>
          </div>
          <div className="ml-auto">
            <Link
              href={`/producer/${product.id}/edit`}
              className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Ajuster le stock
            </Link>
          </div>
        </div>
        
        {/* Onglets des fonctionnalités */}
        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendrier de production
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alertes de stock
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <StockDashboard 
              productId={product.id} 
              productUnit={product.unit} 
            />
          </TabsContent>
          
          <TabsContent value="production">
            <ProductionSchedule 
              productId={product.id} 
              productUnit={product.unit} 
            />
          </TabsContent>
          
          <TabsContent value="alerts">
            <StockAlertConfig productId={product.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}