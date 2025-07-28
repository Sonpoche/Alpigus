// components/products/modern-product-card.tsx
import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { Heart, ShoppingCart, Star, MapPin, Leaf, Package, Pill } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { formatNumber } from '@/lib/number-utils'
import { WishlistButton } from '@/components/wishlist/wishlist-button'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
  producer?: {
    companyName?: string | null
    user: {
      name: string | null
    }
  }
}

interface ModernProductCardProps {
  product: Product
}

export function ModernProductCard({ product }: ModernProductCardProps) {
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (product.type === ProductType.FRESH) {
      window.location.href = `/products/${product.id}`
      return
    }
    
    setIsAddingToCart(true)
    
    try {
      const quantity = product.minOrderQuantity || 1
      await addToCart(product, quantity)
      
      toast({
        title: "Produit ajouté",
        description: `${formatNumber(quantity)} ${product.unit} de ${product.name} ajouté au panier`,
        duration: 3000,
      })
      
    } catch (error: any) {
      console.error('Erreur addToCart:', error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter au panier",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  const getTypeInfo = () => {
    switch (product.type) {
      case ProductType.FRESH:
        return { label: 'Frais', icon: Leaf, color: 'text-green-600' }
      case ProductType.DRIED:
        return { label: 'Séché', icon: Package, color: 'text-amber-600' }
      case ProductType.SUBSTRATE:
        return { label: 'Substrat', icon: Leaf, color: 'text-blue-600' }
      case ProductType.WELLNESS:
        return { label: 'Bien-être', icon: Pill, color: 'text-purple-600' }
      default:
        return { label: 'Autre', icon: Package, color: 'text-gray-600' }
    }
  }

  const getProducerName = () => {
    return product.producer?.companyName || product.producer?.user?.name || 'Producteur'
  }

  const typeInfo = getTypeInfo()
  const TypeIcon = typeInfo.icon

  // Simulation de données pour note et localisation
  const rating = (4.5 + Math.random() * 0.5).toFixed(1)
  const reviewCount = Math.floor(5 + Math.random() * 50)
  const location = "Suisse"

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group cursor-pointer"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/products/${product.id}`}>
        {/* Image principale */}
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <TypeIcon className={cn("w-12 h-12", typeInfo.color)} />
            </div>
          )}
          
          {/* Bouton favoris */}
          <div className="absolute top-3 right-3">
            <WishlistButton 
              productId={product.id}
              size="sm"
              variant="ghost"
              className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full w-8 h-8 shadow-sm border-0"
            />
          </div>
          
          {/* Badge type */}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
              <TypeIcon className="w-3 h-3" />
              {typeInfo.label}
            </span>
          </div>
          
          {/* Badge indisponible */}
          {!product.available && (
            <div className="absolute bottom-3 left-3">
              <span className="bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-white">
                Indisponible
              </span>
            </div>
          )}
          
          {/* Hover overlay avec bouton panier */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isHovered && product.available ? 1 : 0 
            }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/20 flex items-center justify-center"
          >
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-lg"
            >
              {isAddingToCart ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    {product.type === ProductType.FRESH ? 'Réserver' : 'Ajouter au panier'}
                  </span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      </Link>
      
      {/* Informations produit */}
      <Link href={`/products/${product.id}`} className="block">
        <div className="space-y-1">
          {/* Localisation et note */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-500 text-sm">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{location}</span>
            </div>
            <div className="flex items-center text-sm">
              <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
              <span className="font-medium">{rating}</span>
              <span className="text-gray-500 ml-1">({reviewCount})</span>
            </div>
          </div>
          
          {/* Nom du produit */}
          <h3 className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-1">
            {product.name}
          </h3>
          
          {/* Producteur */}
          <p className="text-sm text-gray-500 line-clamp-1">
            {getProducerName()}
          </p>
          
          {/* Prix */}
          <div className="flex items-baseline space-x-1 pt-1">
            <span className="font-semibold text-gray-900">
              {formatNumber(product.price)} CHF
            </span>
            <span className="text-sm text-gray-500">
              / {product.unit}
            </span>
          </div>
          
          {/* Quantité minimale */}
          {product.minOrderQuantity && product.minOrderQuantity > 1 && (
            <p className="text-xs text-gray-400">
              Min. {formatNumber(product.minOrderQuantity)} {product.unit}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}