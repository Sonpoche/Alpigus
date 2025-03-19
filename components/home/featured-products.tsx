// components/home/featured-products.tsx
'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from '@/components/products/product-card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/products?limit=6&featured=true')
        if (!response.ok) throw new Error('Erreur lors du chargement des produits')
        
        const data = await response.json()
        setProducts(data.products || [])
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits vedettes",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProducts()
  }, [toast])
  
  // Skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center font-montserrat text-custom-title mb-12">
            Produits en vedette
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-foreground/10 rounded-t-lg"></div>
                <div className="card-body">
                  <div className="h-6 w-2/3 bg-foreground/10 rounded mb-2"></div>
                  <div className="h-4 w-full bg-foreground/10 rounded mb-2"></div>
                  <div className="h-4 w-4/5 bg-foreground/10 rounded mb-4"></div>
                  <div className="flex justify-between mb-3">
                    <div className="h-6 w-1/4 bg-foreground/10 rounded"></div>
                    <div className="h-6 w-1/4 bg-foreground/10 rounded"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-1/2 bg-foreground/10 rounded"></div>
                    <div className="h-10 w-1/2 bg-foreground/10 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }
  
  // Si aucun produit n'est disponible
  if (products.length === 0) {
    return null
  }
  
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-bold font-montserrat text-custom-title">
            Produits en vedette
          </h2>
          <div className="flex gap-2">
            <button className="p-2 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div key={product.id} className="hover-lift">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="/products" 
            className="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-foreground/5 hover-lift"
          >
            Voir tous les produits
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}