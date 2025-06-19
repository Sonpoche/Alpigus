// components/products/product-card.tsx

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Tag, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { formatNumber } from '@/lib/number-utils'
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
  const [quantity, setQuantity] = useState(
    product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
  )
  const [showQuantitySelector, setShowQuantitySelector] = useState(false)
  
  const handleAddToCart = async () => {
    // Pour les produits frais, on utilise le calendrier de livraison
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    setIsAddingToCart(true)
    try {
      const success = await addToCart(product, quantity)
      
      if (success) {
        setShowAnimation(true)
        
        toast({
          title: "Produit ajouté",
          description: `${formatNumber(quantity)} ${product.unit} de ${product.name} ajouté au panier`
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
  
  // Gestion de la quantité
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1)
  }
  
  const decrementQuantity = () => {
    const minQty = product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
    
    if (quantity > minQty) {
      setQuantity(prev => prev - 1)
    }
  }
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    const minQty = product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
    
    if (!isNaN(value) && value >= minQty) {
      setQuantity(value)
    }
  }
  
  return (
    <>
      <div 
        className="card overflow-hidden transition-all duration-300 h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setShowQuantitySelector(false)
        }}
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
                <span className="text-2xl sm:text-4xl">🍄</span>
              </div>
            )}
            
            {/* Badges - Responsive */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 sm:gap-2">
              {product.type === ProductType.FRESH && (
                <Badge variant="info" className="bg-blue-500/90 text-white shadow-md text-xs">Frais</Badge>
              )}
              {product.acceptDeferred && (
                <Badge variant="outline" className="bg-green-500/90 text-white shadow-md text-xs">Paiement 30j</Badge>
              )}
            </div>
            
            {/* Badge de disponibilité */}
            <div className="absolute top-2 right-2">
              <Badge className={`${product.available ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'} shadow-md text-xs`}>
                {product.available ? 'Disponible' : 'Indisponible'}
              </Badge>
            </div>
          </div>
        </Link>

        {/* Corps de la carte - Responsive */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          {/* Zone supérieure */}
          <div className="mb-2">
            <Link href={`/products/${product.id}`}>
              <h3 className="font-semibold text-sm sm:text-lg text-custom-title mb-1 hover:text-custom-accent line-clamp-1">
                {product.name}
              </h3>
            </Link>
          </div>

          {/* Catégories - Responsive */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="outline" className="text-xs flex items-center">
              <Tag className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />{product.type}
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
          
          {/* Espace flexible */}
          <div className="flex-1 min-h-[24px] flex items-center">
            {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0) ? (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded-md w-full">
                Minimum: {formatNumber(product.minOrderQuantity)} {product.unit}
              </div>
            ) : null}
          </div>
          
          {/* Zone inférieure - Prix et boutons */}
          <div className="mt-auto pt-3 border-t border-foreground/5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-sm sm:text-lg text-custom-title truncate">
                  {formatNumber(product.price)} CHF/{product.unit}
                </span>
                {product.stock && (
                  <span className="text-xs text-muted-foreground truncate">
                    Stock: {formatNumber(product.stock.quantity)} {product.unit}
                  </span>
                )}
              </div>
            </div>
            
            {/* Boutons d'action - Responsive */}
            {product.available && (
              <>
                {/* Sélecteur de quantité - Compact sur mobile */}
                {showQuantitySelector && product.type !== ProductType.FRESH && (
                  <div className="flex items-center justify-between mb-3 bg-foreground/5 rounded-md p-2">
                    <button 
                      onClick={decrementQuantity} 
                      className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-accent text-xs"
                      disabled={quantity <= (product.minOrderQuantity || 1)}
                    >
                      <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                    </button>
                    <input 
                      type="number" 
                      value={formatNumber(quantity)} 
                      onChange={handleQuantityChange}
                      min={product.minOrderQuantity || 1}
                      className="w-10 sm:w-14 text-center bg-background border border-foreground/10 rounded-md px-1 sm:px-2 py-1 text-xs sm:text-sm"
                    />
                    <span className="text-xs px-1">{product.unit}</span>
                    <button 
                      onClick={incrementQuantity} 
                      className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-accent text-xs"
                    >
                      <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link 
                    href={`/products/${product.id}`}
                    className="w-8 sm:w-12 flex items-center justify-center py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                    aria-label="Détails"
                  >
                    <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                  
                  {product.type === ProductType.FRESH ? (
                    <Link 
                      href={`/products/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Réserver</span>
                    </Link>
                  ) : (
                    <>
                      {!showQuantitySelector ? (
                        <button
                          onClick={() => setShowQuantitySelector(true)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors text-xs sm:text-sm font-medium"
                        >
                          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">
                            {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0)
                              ? `${formatNumber(product.minOrderQuantity)} ${product.unit}`
                              : 'Ajouter'}
                          </span>
                          <span className="sm:hidden">+</span>
                        </button>
                      ) : (
                        <LoadingButton
                         onClick={handleAddToCart}
                         isLoading={isAddingToCart}
                         size="sm"
                         width="full"
                         className="text-xs sm:text-sm"
                         icon={<ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />}
                       >
                         <span className="hidden sm:inline">Ajouter au panier</span>
                         <span className="sm:hidden">Ajouter</span>
                       </LoadingButton>
                     )}
                   </>
                 )}
               </div>
             </>
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