// app/(protected)/producteur/inventaire/[productId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Package, ChevronLeft, BarChart2, Calendar, Bell } from 'lucide-react'
import Link from 'next/link'
import StockAlertConfig from '@/components/stock/stock-alert-config'
import StockDashboard from '@/components/stock/stock-dashboard'
import ProductionSchedule from '@/components/stock/production-schedule'
import { containerClasses, spacingClasses, cardClasses, gridClasses, cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'production' | 'alerts'>('dashboard')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${params.productId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/producteur')
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
      <div className={containerClasses(spacingClasses('md'))}>
        <div className="text-center">
          <p className="text-sm sm:text-base">Produit non trouvé</p>
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Tableau de bord',
      shortLabel: 'Stats',
      icon: BarChart2
    },
    {
      id: 'production' as const,
      label: 'Calendrier de production',
      shortLabel: 'Production',
      icon: Calendar
    },
    {
      id: 'alerts' as const,
      label: 'Alertes de stock',
      shortLabel: 'Alerte',
      icon: Bell
    }
  ]

  return (
    <div className={containerClasses("py-4 sm:py-6 lg:py-8")}>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-foreground/5 rounded-md transition-colors self-start"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-montserrat font-bold text-custom-title line-clamp-2">
              Gestion du stock : {product.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Consultez, analysez et planifiez vos stocks
            </p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardClasses("mb-6 sm:mb-8")}
        >
          <div className={spacingClasses('sm')}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 sm:p-4 bg-background rounded-full border border-foreground/10">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-custom-accent" />
                </div>
                <div>
                  <h2 className="font-medium text-sm sm:text-base mb-1">Stock actuel</h2>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                    {product.stock?.quantity || 0} {product.unit}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto">
                <Link
                  href={`/producteur/${product.id}/modifier`}
                  className="inline-flex items-center justify-center bg-custom-accent text-white px-3 sm:px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm sm:text-base w-full sm:w-auto"
                >
                  Ajuster le stock
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cardClasses("mb-6 sm:mb-8")}
        >
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg transition-all",
                      activeTab === tab.id
                        ? "bg-custom-accent text-white shadow-md"
                        : "hover:bg-foreground/5 text-foreground/70"
                    )}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs sm:text-sm font-medium text-center">
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
        
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {activeTab === 'dashboard' && (
            <StockDashboard 
              productId={product.id} 
              productUnit={product.unit} 
            />
          )}
          
          {activeTab === 'production' && (
            <ProductionSchedule 
              productId={product.id} 
              productUnit={product.unit} 
            />
          )}
          
          {activeTab === 'alerts' && (
            <div className={gridClasses({ default: 1, lg: 2 }, "gap-4 sm:gap-6")}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cardClasses("h-fit")}
              >
                <div className={spacingClasses('sm')}>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                    <h3 className="font-semibold text-base sm:text-lg">Statistiques</h3>
                  </div>
                  <StockDashboard 
                    productId={product.id} 
                    productUnit={product.unit} 
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cardClasses("h-fit")}
              >
                <div className={spacingClasses('sm')}>
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                    <h3 className="font-semibold text-base sm:text-lg">Alertes de stock</h3>
                  </div>
                  <StockAlertConfig productId={product.id} />
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}