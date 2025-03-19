// components/products/product-card.tsx
'use client'

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { LoadingButton } from '@/components/ui/loading-button'
import { AddToCartAnimation } from '@/components/cart/add-to-cart-animation'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  categories: { id: string; name: string }[]
  stock?: {
    quantity: number
  } | null
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  
  const handleAddToCart = async () => {
    // Pour les produits frais, on utilise le calendrier de livraison
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    // Pour les autres types de produits, on ajoute directement au panier
    setIsAddingToCart(true)
    try {
      const success = await addToCart(product, 1)
      
      if (success) {
        setShowAnimation(true)
        
        toast({
          title: "Produit ajouté",
          description: `1 ${product.unit} de ${product.name} ajouté au panier`
        })
      } else {
        throw new Error('Erreur lors de l\'ajout au panier')
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter au panier",
        variant: "destructive"
      })
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  return (
    <>
      <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        {/* Image avec lien vers détail */}
        <Link href={`/products/${product.id}`}>
          <div className="aspect-square bg-foreground/5">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl">🍄</span>
              </div>
            )}
          </div>
        </Link>

        {/* Infos */}
        <div className="p-4">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-custom-title mb-1 hover:text-custom-accent">
              {product.name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
          
          {/* Prix et disponibilité */}
          <div className="flex justify-between items-center">
            <span className="font-medium text-lg">{product.price.toFixed(2)} CHF</span>
            <span className={`text-sm ${product.available ? 'text-green-600' : 'text-red-600'}`}>
              {product.available ? 'Disponible' : 'Indisponible'}
            </span>
          </div>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1 mb-3">
            <span className="text-xs px-2 py-1 bg-foreground/5 rounded-full">
              {product.type}
            </span>
            {product.categories.map(cat => (
              <span
                key={cat.id}
                className="text-xs px-2 py-1 bg-custom-accent/10 text-custom-accent rounded-full"
              >
                {cat.name}
              </span>
            ))}
          </div>
          
          {/* Boutons d'action */}
          {product.available && (
            <div className="flex gap-2 mt-3">
              <Link 
                href={`/products/${product.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm font-medium"
              >
                <Info className="h-4 w-4" />
                Détails
              </Link>
              
              {product.type === ProductType.FRESH ? (
                <Link 
                  href={`/products/${product.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  <Truck className="h-4 w-4" />
                  Réserver
                </Link>
              ) : (
                <LoadingButton
                  onClick={handleAddToCart}
                  isLoading={isAddingToCart}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Ajouter
                </LoadingButton>
              )}
            </div>
          )}
        </div>
      </div>
      
      <AddToCartAnimation
        isOpen={showAnimation}
        onClose={() => setShowAnimation(false)}
        productName={product.name}
        productImage={product.image}
      />
    </>
  )
}