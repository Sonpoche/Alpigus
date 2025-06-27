// components/products/product-list-item.tsx - VERSION RESPONSIVE LÉGÈRE
import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Tag, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatPriceSimple, formatQuantity, formatInputValue, parseToTwoDecimals, formatNumber } from '@/lib/number-utils'
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
  const [quantity, setQuantity] = useState(
    product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
  )
  const [showQuantitySelector, setShowQuantitySelector] = useState(false)
  
  const handleAddToCart = async () => {
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    setIsAddingToCart(true)
    
    try {
      await addToCart(product, quantity)
      
      toast({
        title: "✅ Produit ajouté",
        description: `${formatQuantity(quantity, product.unit)} de ${product.name} ajouté au panier`,
        duration: 3000,
      })
      
    } catch (error: any) {
      console.error('Erreur addToCart:', error)
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible d'ajouter au panier",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  const incrementQuantity = () => {
    setQuantity(prev => parseToTwoDecimals(prev + 1))
  }
  
  const decrementQuantity = () => {
    const minQty = product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
    
    if (quantity > minQty) {
      setQuantity(prev => parseToTwoDecimals(prev - 1))
    }
  }
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatInputValue(e.target.value)
    const numValue = parseFloat(formattedValue)
    const minQty = product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
    
    if (!isNaN(numValue) && numValue >= minQty) {
      setQuantity(parseToTwoDecimals(numValue))
    }
  }
  
  return (
    <>
      <div className="card flex hover:shadow-md transition-shadow overflow-hidden">
        {/* Image avec lien vers détail - Légèrement plus petite sur mobile */}
        <Link href={`/products/${product.id}`} className="w-28 sm:w-32 md:w-40 h-auto bg-foreground/5 flex-shrink-0 relative">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl sm:text-4xl">🍄</span>
            </div>
          )}
          
          {/* Badge de disponibilité */}
          <div className="absolute top-2 right-2">
            <Badge className={`${product.available ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'} shadow-md text-xs`}>
              {product.available ? 'Disponible' : 'Indisponible'}
            </Badge>
          </div>
        </Link>

        {/* Contenu - Padding légèrement réduit sur mobile */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col min-w-0">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
                <h3 className="font-semibold text-white hover:text-custom-accent truncate">
                  {product.name}
                </h3>
              </Link>
            </div>
            
            {/* Description - Cachée sur très petits écrans */}
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 hidden xs:block sm:block">{product.description}</p>
            
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
            
            {/* Information quantité minimale */}
            {product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 && (
              <p className="text-xs text-muted-foreground mb-2">
                Quantité minimale: {formatNumber(product.minOrderQuantity)} {product.unit}
              </p>
            )}
            
            {/* Prix */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-lg font-bold text-custom-accent">
                {formatPriceSimple(product.price)} CHF
              </span>
              <span className="text-sm text-muted-foreground">/{product.unit}</span>
              {product.stock && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Stock: {formatPriceSimple(product.stock.quantity)} {product.unit}
                </span>
              )}
            </div>
          </div>

          {/* Actions - Boutons alignés */}
          {!product.available ? (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Produit indisponible
            </div>
          ) : (
            <>
              {/* Sélecteur de quantité conditionnel */}
              {showQuantitySelector && product.type !== ProductType.FRESH && (
                <div className="flex items-center border border-foreground/20 rounded-md mb-3">
                  <button
                    onClick={decrementQuantity}
                    className="p-1 hover:bg-foreground/5 rounded-l"
                    disabled={quantity <= (product.minOrderQuantity || 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="flex-1 text-center border-0 bg-transparent text-sm py-2 focus:outline-none"
                    min={product.minOrderQuantity || 1}
                    step="0.1"
                  />
                  <span className="text-sm text-muted-foreground px-2">{product.unit}</span>
                  <button
                    onClick={incrementQuantity}
                    className="p-1 hover:bg-foreground/5 rounded-r"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Boutons - Empilés sur très petits écrans, en ligne ailleurs */}
              <div className="flex flex-col xs:flex-row gap-2">
                {product.type === ProductType.FRESH ? (
                  <>
                    {/* Bouton Réserver pour produits frais */}
                    <Link 
                      href={`/products/${product.id}`}
                      className="flex-[2] flex items-center justify-center gap-2 py-2 btn-primary rounded-md transition-colors text-sm font-medium"
                    >
                      <Truck className="h-4 w-4" />
                      Réserver
                    </Link>
                    
                    {/* Bouton Informations */}
                    <Link 
                      href={`/products/${product.id}`}
                      className="flex-1 flex items-center justify-center py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                      title="Voir les détails"
                    >
                      <Info className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Bouton Ajouter au panier */}
                    <LoadingButton
                      onClick={handleAddToCart}
                      isLoading={isAddingToCart}
                      className="flex-[2] btn-primary"
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Ajouter {formatNumber(quantity)} {product.unit}
                    </LoadingButton>
                    
                    {/* Conteneur pour les boutons secondaires - 90/10 */}
                    <div className="flex gap-2 flex-1">
                      {/* Bouton Choisir quantité - 90% */}
                      <button
                        onClick={() => setShowQuantitySelector(!showQuantitySelector)}
                        className="flex-[9] flex items-center justify-center gap-1 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                        title={showQuantitySelector ? "Masquer" : "Choisir la quantité"}
                      >
                        <Tag className="h-4 w-4" />
                        {showQuantitySelector ? "OK" : "Quantité"}
                      </button>
                      
                      {/* Bouton Informations - 10% */}
                      <Link 
                        href={`/products/${product.id}`}
                        className="flex-1 flex items-center justify-center py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
                        title="Voir les détails"
                      >
                        <Info className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}