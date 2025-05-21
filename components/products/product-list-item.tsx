// components/products/product-list-item.tsx

import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Tag, Plus, Minus } from 'lucide-react'
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
  minOrderQuantity?: number
  acceptDeferred?: boolean
}

interface ProductListItemProps {
  product: Product
}

export function ProductListItem({ product }: ProductListItemProps) {
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
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
          description: `${quantity} ${product.unit} de ${product.name} ajouté(s) au panier`
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
  
  // Formater le prix pour n'afficher que 2 décimales maximum
  const formatPrice = (price: number): string => {
    return price.toFixed(2).replace(/\.00$/, '')
  }
  
  return (
    <>
      <div className="card flex hover:shadow-md transition-shadow overflow-hidden">
        {/* Image avec lien vers détail */}
        <Link href={`/products/${product.id}`} className="w-32 sm:w-40 h-auto bg-foreground/5 flex-shrink-0 relative">
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
          
          {/* Badge de disponibilité */}
          <div className="absolute top-2 right-2">
            <Badge className={`${product.available ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'} shadow-md text-xs`}>
              {product.available ? 'Disponible' : 'Indisponible'}
            </Badge>
          </div>
        </Link>

        {/* Contenu */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <Link href={`/products/${product.id}`}>
                <h3 className="font-semibold text-custom-title hover:text-custom-accent">
                  {product.name}
                </h3>
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
            
            {/* Tags */}
            <div className="mb-3 flex flex-wrap gap-1">
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
            
            {/* Information quantité minimale si applicable */}
            {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0) ? (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded-md mb-3 inline-block">
                Minimum: {product.minOrderQuantity} {product.unit}
              </div>
            ) : null}

            {/* Sélecteur de quantité */}
            {showQuantitySelector && product.type !== ProductType.FRESH && (
              <div className="flex items-center mb-3 bg-foreground/5 rounded-md p-2 w-fit">
                <button 
                  onClick={decrementQuantity} 
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-accent"
                  disabled={quantity <= (product.minOrderQuantity || 1)}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={handleQuantityChange}
                  min={product.minOrderQuantity || 1}
                  className="w-16 text-center bg-background border border-foreground/10 rounded-md mx-2 px-2 py-1 text-sm"
                />
                <span className="text-xs mr-2">{product.unit}</span>
                <button 
                  onClick={incrementQuantity} 
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          
          {/* Prix et actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-foreground/5">
            <div>
              <span className="font-medium text-lg">{formatPrice(product.price)} CHF/{product.unit}</span>
              {product.stock && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Stock: {formatPrice(product.stock.quantity)} {product.unit})
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
                  <>
                    {!showQuantitySelector ? (
                      <button
                        onClick={() => setShowQuantitySelector(true)}
                        className="flex items-center justify-center gap-1 py-2 px-3 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-all text-sm font-medium"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0)
                            ? `Ajouter ${product.minOrderQuantity} ${product.unit}`
                            : 'Ajouter'}
                        </span>
                      </button>
                    ) : (
                      <LoadingButton
                        onClick={handleAddToCart}
                        isLoading={isAddingToCart}
                        size="sm"
                        icon={<ShoppingCart className="h-4 w-4" />}
                      >
                        <span className="hidden sm:inline">
                          Ajouter au panier
                        </span>
                      </LoadingButton>
                    )}
                  </>
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