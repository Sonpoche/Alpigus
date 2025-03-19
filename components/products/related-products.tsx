// components/products/related-products.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { ProductCard } from './product-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductType } from '@prisma/client'

interface RelatedProductsProps {
  currentProductId: string
  categoryId?: string
  productType?: ProductType
  limit?: number
}

export default function RelatedProducts({ 
  currentProductId, 
  categoryId, 
  productType, 
  limit = 4
}: RelatedProductsProps) {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setIsLoading(true)
        
        // Construire l'URL avec les filtres
        const url = new URL('/api/products', window.location.origin)
        url.searchParams.append('limit', limit.toString())
        
        if (categoryId) url.searchParams.append('category', categoryId)
        if (productType) url.searchParams.append('type', productType)
        url.searchParams.append('exclude', currentProductId)
        url.searchParams.append('available', 'true')
        
        const response = await fetch(url.toString())
        if (!response.ok) throw new Error('Erreur lors du chargement des produits similaires')
        
        const data = await response.json()
        setProducts(data.products || [])
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits similaires",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRelatedProducts()
  }, [currentProductId, categoryId, productType, limit, toast])
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-square bg-foreground/10 rounded-t-lg"></div>
            <div className="p-4">
              <div className="h-6 w-2/3 bg-foreground/10 rounded mb-2"></div>
              <div className="h-4 w-full bg-foreground/10 rounded mb-2"></div>
              <div className="h-4 w-4/5 bg-foreground/10 rounded mb-4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (products.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Aucun produit similaire trouvé
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <div key={product.id} className="hover-lift">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}