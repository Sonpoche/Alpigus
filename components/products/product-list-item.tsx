// components/products/product-list-item.tsx
'use client'

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { Badge } from '@/components/ui/badge'
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

interface ProductListItemProps {
  product: Product
}

export function ProductListItem({ product }: ProductListItemProps) {
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [quantity, setQuantity] = useState(1)
  
  const handleAddToCart = async () => {
    // Pour les produits frais, on utilise le calendrier de livraison
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    // Pour les autres types de produits, on ajoute directement au panier
    setIsAddingToCart(true)
    try {
      const success = await addToCart(product, quantity)
      
      if (success) {
        setShowAnimation(true)
        
        toast({
          title: "Produit ajouté",
          description: `${quantity} ${product.unit} de ${product.name} ajouté au panier`
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
      <div className="card flex hover:shadow-md transition-shadow overflow-hidden">
        {/* Image avec lien vers détail */}
        <Link href={`/products/${product.id}`} className="w-32 sm:w-48 h-auto bg-foreground/5 flex-shrink-0">
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
        </Link>

        {/* Contenu */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <Link href={`/products/${product.id}`}>
              <h3 className="font-semibold text-custom-title mb-1 hover:text-custom-accent">
                {product.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
            
            {/* Tags */}
            <div className="mb-3 flex flex-wrap gap-1">
              <Badge variant="outline">{product.type}</Badge>
              {product.categories.slice(0, 2).map(cat => (
                <Badge key={cat.id} variant="secondary">{cat.name}</Badge>
              ))}
              {product.categories.length > 2 && (
                <Badge variant="outline">+{product.categories.length - 2}</Badge>
              )}
            </div>
          </div>
          
          {/* Prix et actions */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-medium text-lg">{product.price.toFixed(2)} CHF</span>
              <span className={`text-sm ml-2 ${product.available ? 'text-green-600' : 'text-red-600'}`}>
                {product.available ? 'Disponible' : 'Indisponible'}
              </span>
              {product.stock && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Stock: {product.stock.quantity} {product.unit})
                </span>
              )}
            </div>
            
            {/* Boutons d'action */}
            {product.available && (
              <div className="flex gap-2">
                <Link 
                  href={`/products/${product.id}`}
                  className="flex items-center justify-center gap-1 py-2 px-3 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm font-medium"
                >
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Détails</span>
                </Link>
                
                {product.type === ProductType.FRESH ? (
                  <Link 
                    href={`/products/${product.id}`}
                    className="flex items-center justify-center gap-1 py-2 px-3 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-all text-sm font-medium"
                  >
                    <Truck className="h-4 w-4" />
                    <span className="hidden sm:inline">Réserver</span>
                  </Link>
                ) : (
                  <LoadingButton
                    onClick={handleAddToCart}
                    isLoading={isAddingToCart}
                    size="sm"
                    icon={<ShoppingCart className="h-4 w-4" />}
                  >
                    <span className="hidden sm:inline">Ajouter</span>
                  </LoadingButton>
                )}
              </div>
            )}
          </div>
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