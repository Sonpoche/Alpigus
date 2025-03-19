// components/products/product-card.tsx
'use client'

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { AddToCartAnimation } from '@/components/cart/add-to-cart-animation'
import { motion } from 'framer-motion'
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
  const [isHovered, setIsHovered] = useState(false)
  
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
  
  const productTypeColor = () => {
    switch (product.type) {
      case ProductType.FRESH:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      case ProductType.DRIED:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      case ProductType.SUBSTRATE:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
      case ProductType.WELLNESS:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
      default:
        return 'bg-foreground/5 text-foreground/70'
    }
  }
  
  return (
    <>
      <div 
        className="card overflow-hidden transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image avec lien vers détail */}
        <Link href={`/products/${product.id}`}>
          <div className="aspect-square bg-foreground/5 relative overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500"
                style={{ 
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl">🍄</span>
              </div>
            )}
            
            {/* Badges de coin */}
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              {product.type === ProductType.FRESH && (
                <Badge variant="info" className="bg-blue-500/90 text-white shadow-md">Frais</Badge>
              )}
              
              {/* Ajoutez ici d'autres badges comme "Nouveau", "Populaire", etc. */}
            </div>
            
            {/* Type */}
            <div className="absolute top-2 right-2">
              <Badge className={`${productTypeColor()} shadow-md`}>
                {product.type}
              </Badge>
            </div>
            
            {/* Disponibilité */}
            <div className="absolute bottom-0 inset-x-0 p-2 text-center text-sm font-medium backdrop-blur-sm">
              {product.available ? (
                <div className="bg-green-500/90 text-white py-1 px-2 rounded-md">
                  Disponible
                </div>
              ) : (
                <div className="bg-red-500/90 text-white py-1 px-2 rounded-md">
                  Indisponible
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Infos */}
        <div className="p-4">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-custom-title mb-1 hover:text-custom-accent truncate">
              {product.name}
            </h3>
          </Link>
          
          <div className="flex items-center text-amber-500 mb-2">
            <Star className="h-4 w-4 fill-amber-500" />
            <Star className="h-4 w-4 fill-amber-500" />
            <Star className="h-4 w-4 fill-amber-500" />
            <Star className="h-4 w-4 fill-amber-500" />
            <Star className="h-4 w-4" />
            <span className="text-xs text-muted-foreground ml-1">(16)</span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
          
          {/* Prix et stock */}
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-lg">{product.price.toFixed(2)} CHF</span>
            {product.stock && (
              <span className="text-xs text-muted-foreground">
                Stock: {product.stock.quantity} {product.unit}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1 mb-3">
            {product.categories.map(cat => (
              <Badge
                key={cat.id}
                variant="secondary"
                className="text-xs"
              >
                {cat.name}
              </Badge>
            ))}
          </div>
          
          {/* Boutons d'action */}
          {product.available && (
            <motion.div 
              className="flex gap-2 mt-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
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
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors text-sm font-medium"
                >
                  <Truck className="h-4 w-4" />
                  Réserver
                </Link>
              ) : (
                <LoadingButton
                  onClick={handleAddToCart}
                  isLoading={isAddingToCart}
                  size="sm"
                  width="full"
                  icon={<ShoppingCart className="h-4 w-4" />}
                >
                  Ajouter
                </LoadingButton>
              )}
            </motion.div>
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