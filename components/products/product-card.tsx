// components/products/product-card.tsx - VERSION CORRIGÉE AVEC WISHLIST
import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { ShoppingCart, Info, Truck, Tag, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { formatNumber } from '@/lib/number-utils'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { WishlistButton } from '@/components/wishlist/wishlist-button' // ✅ AJOUT IMPORT WISHLIST
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
  const [isHovered, setIsHovered] = useState(false)
  const [quantity, setQuantity] = useState(
    product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 
      ? product.minOrderQuantity 
      : 1
  )
  const [showQuantitySelector, setShowQuantitySelector] = useState(false)
  
  // ✅ CORRECTION: Fonction handleAddToCart améliorée
  const handleAddToCart = async () => {
    // Pour les produits frais, on utilise le calendrier de livraison
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    setIsAddingToCart(true)
    
    try {
      // ✅ CORRECTION: Attendre le résultat ET gérer les erreurs correctement
      await addToCart(product, quantity)
      
      // ✅ CORRECTION: Toast déplacé ici pour être sûr qu'il s'affiche
      toast({
        title: "✅ Produit ajouté",
        description: `${formatNumber(quantity)} ${product.unit} de ${product.name} ajouté au panier`,
        duration: 3000, // ✅ CORRECTION: Durée explicite
      })
      
    } catch (error: any) {
      // ✅ CORRECTION: Gestion d'erreur améliorée
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
  
  // Type de produit avec icône
  const getTypeInfo = () => {
    switch (product.type) {
      case ProductType.FRESH:
        return { label: 'Frais', bgColor: 'bg-emerald-100 text-emerald-800', icon: '🌱' }
      case ProductType.DRIED:
        return { label: 'Séché', bgColor: 'bg-amber-100 text-amber-800', icon: '🍄' }
      case ProductType.SUBSTRATE:
        return { label: 'Substrat', bgColor: 'bg-blue-100 text-blue-800', icon: '🌿' }
      case ProductType.WELLNESS:
        return { label: 'Bien-être', bgColor: 'bg-purple-100 text-purple-800', icon: '💊' }
      default:
        return { label: 'Autre', bgColor: 'bg-gray-100 text-gray-800', icon: '📦' }
    }
  }
  
  const typeInfo = getTypeInfo()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="bg-background rounded-lg border border-foreground/10 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Image du produit */}
      <div className="relative aspect-square">
        <Link href={`/products/${product.id}`}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
              <div className="text-4xl">{typeInfo.icon}</div>
            </div>
          )}
        </Link>
        
        {/* Badge de type */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.bgColor}`}>
            {typeInfo.label}
          </span>
        </div>
        
        {/* ✅ AJOUT DU BOUTON WISHLIST */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Bouton Favoris */}
          <WishlistButton 
            productId={product.id}
            size="sm"
            variant="ghost"
            className="bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"
          />
          
          {/* Badge de disponibilité - repositionné si nécessaire */}
          {!product.available && (
            <Badge variant="destructive" className="text-xs">
              Indisponible
            </Badge>
          )}
        </div>
      </div>
      
      {/* Contenu */}
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-base mb-2 line-clamp-2 hover:text-custom-accent transition-colors">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {product.description}
        </p>
        
        {/* Catégories */}
        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.categories.slice(0, 2).map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 bg-foreground/5 text-xs rounded-md text-muted-foreground"
              >
                {category.name}
              </span>
            ))}
            {product.categories.length > 2 && (
              <span className="px-2 py-1 bg-foreground/5 text-xs rounded-md text-muted-foreground">
                +{product.categories.length - 2}
              </span>
            )}
          </div>
        )}
        
        {/* Prix et stock */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-lg font-bold text-custom-accent">
              {formatNumber(product.price)} CHF
            </span>
            <span className="text-sm text-muted-foreground">/{product.unit}</span>
          </div>
          
          {product.stock && (
            <span className="text-xs text-muted-foreground bg-foreground/5 px-2 py-1 rounded">
              Stock: {formatNumber(product.stock.quantity)} {product.unit}
            </span>
          )}
        </div>
        
        {/* Actions - 3 boutons de même taille */}
        <div className="flex gap-2">
          {product.available && (
            <>
              {/* Sélecteur de quantité conditionnel */}
              {showQuantitySelector && product.type !== ProductType.FRESH && (
                <div className="flex-1 flex items-center border border-foreground/20 rounded-md">
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
                    className="flex-1 text-center border-0 bg-transparent text-sm py-1 focus:outline-none"
                    min={product.minOrderQuantity || 1}
                    step="0.1"
                  />
                  <button
                    onClick={incrementQuantity}
                    className="p-1 hover:bg-foreground/5 rounded-r"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Bouton principal - Ajouter au panier */}
              <LoadingButton
                onClick={handleAddToCart}
                isLoading={isAddingToCart}
                disabled={!product.available}
                className={`${showQuantitySelector ? 'flex-1' : 'flex-[2]'} bg-custom-accent hover:opacity-90 text-white`}
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.type === ProductType.FRESH 
                  ? 'Réserver' 
                  : `Ajouter ${formatNumber(quantity)} ${product.unit}`
                }
              </LoadingButton>
              
              {/* Bouton Choisir quantité - seulement si pas déjà ouvert */}
              {!showQuantitySelector && product.type !== ProductType.FRESH && (
                <button
                  onClick={() => setShowQuantitySelector(true)}
                  className="flex-1 p-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors flex items-center justify-center gap-1 text-sm"
                  title="Choisir la quantité"
                >
                  <Tag className="h-4 w-4" />
                  Quantité
                </button>
              )}
              
              {/* Bouton Informations */}
              <Link
                href={`/products/${product.id}`}
                className="p-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors flex items-center justify-center"
                title="Voir les détails"
              >
                <Info className="h-4 w-4" />
              </Link>
            </>
          )}
          
          {!product.available && (
            <div className="w-full text-center py-2 bg-foreground/5 rounded-md text-sm text-muted-foreground">
              Produit indisponible
            </div>
          )}
        </div>
        
        {/* Quantité minimale - Seulement si définie ET > 0 */}
        {product.minOrderQuantity !== undefined && product.minOrderQuantity > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Quantité minimale: {formatNumber(product.minOrderQuantity)} {product.unit}
          </p>
        )}
      </div>
      
    </motion.div>
  )
}