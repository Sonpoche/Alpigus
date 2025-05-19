// components/products/product-card.tsx
'use client'

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Tag } from 'lucide-react'
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
  minOrderQuantity?: number
  acceptDeferred?: boolean
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
    
    // Déterminer la quantité à ajouter (utiliser la quantité minimale si définie)
    const quantityToAdd = product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1;
    
    // Pour les autres types de produits, on ajoute directement au panier
    setIsAddingToCart(true)
    try {
      const success = await addToCart(product, quantityToAdd)
      
      if (success) {
        setShowAnimation(true)
        
        toast({
          title: "Produit ajouté",
          description: `${quantityToAdd} ${product.unit} de ${product.name} ajouté au panier`
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
  
  // Formater le prix pour n'afficher que 2 décimales maximum
  const formatPrice = (price: number): string => {
    return price.toFixed(2).replace(/\.00$/, '')
  }
  
  return (
    <>
      <div 
        className="card overflow-hidden transition-all duration-300 h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image avec lien vers détail */}
        <Link href={`/products/${product.id}`} className="relative block">
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
            
            {/* Badges de coin en haut à gauche */}
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              {product.type === ProductType.FRESH && (
                <Badge variant="info" className="bg-blue-500/90 text-white shadow-md">Frais</Badge>
              )}
              {product.acceptDeferred && (
                <Badge variant="outline" className="bg-green-500/90 text-white shadow-md">Paiement 30j</Badge>
              )}
            </div>
            
            {/* Badge de disponibilité en haut à droite */}
            <div className="absolute top-2 right-2">
              <Badge className={`${product.available ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'} shadow-md`}>
                {product.available ? 'Disponible' : 'Indisponible'}
              </Badge>
            </div>
          </div>
        </Link>

        {/* Corps de la carte avec flex-1 pour remplir l'espace */}
        <div className="p-4 flex flex-col flex-1">
          {/* Zone supérieure avec nom et évaluation */}
          <div className="mb-2">
            <Link href={`/products/${product.id}`}>
              <h3 className="font-semibold text-lg text-custom-title mb-1 hover:text-custom-accent line-clamp-1">
                {product.name}
              </h3>
            </Link>
            
            
          </div>

          {/* Catégories dans une ligne dédiée */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="outline" className="text-xs flex items-center">
              <Tag className="h-3 w-3 mr-1" />{product.type}
            </Badge>
            {product.categories.slice(0, 2).map(cat => (
              <Badge key={cat.id} variant="secondary" className="text-xs">
                {cat.name}
              </Badge>
            ))}
            {product.categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{product.categories.length - 2}
              </Badge>
            )}
          </div>
          
          {/* Espace entre tags et prix - croît pour occuper l'espace disponible */}
          <div className="flex-1 min-h-[24px] flex items-center">
            {/* Information quantité minimale si applicable */}
            {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0) ? (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded-md w-full">
                Minimum: {product.minOrderQuantity} {product.unit}
              </div>
            ) : null}
          </div>
          
          {/* Zone inférieure avec prix et boutons - toujours alignée en bas */}
          <div className="mt-auto pt-3 border-t border-foreground/5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col">
                <span className="font-medium text-lg">{formatPrice(product.price)} CHF/{product.unit}</span>
                {product.stock && (
                  <span className="text-xs text-muted-foreground">
                    Stock: {formatPrice(product.stock.quantity)} {product.unit}
                  </span>
                )}
              </div>
            </div>
            
            {/* Boutons d'action */}
            {product.available && (
              <div className="flex gap-2">
                <Link 
                  href={`/products/${product.id}`}
                  className="w-12 flex items-center justify-center py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                  aria-label="Détails"
                >
                  <Info className="h-4 w-4" />
                </Link>
                
                {product.type === ProductType.FRESH ? (
                  <Link 
                    href={`/products/${product.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors text-sm font-medium"
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Réserver
                  </Link>
                ) : (
                  <LoadingButton
                    onClick={handleAddToCart}
                    isLoading={isAddingToCart}
                    size="sm"
                    width="full"
                    icon={<ShoppingCart className="h-4 w-4 mr-1" />}
                  >
                    {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0)
                      ? `Ajouter ${product.minOrderQuantity} ${product.unit}`
                      : 'Ajouter'}
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