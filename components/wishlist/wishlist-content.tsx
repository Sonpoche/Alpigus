// components/wishlist/wishlist-content.tsx - VERSION SIMPLIFIÉE
'use client'

import { useState, useEffect } from 'react'
import { Heart, Trash2, Package, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductType } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/number-utils'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface WishlistItem {
  id: string
  createdAt: string
  product: {
    id: string
    name: string
    description?: string
    price: number
    type: ProductType
    image: string | null
    unit: string
    available: boolean
    producer: {
      id: string
      companyName: string
    }
    stock?: {
      quantity: number
    }
    categories?: Array<{
      id: string
      name: string
    }>
    minOrderQuantity?: number
  }
}

export function WishlistContent() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/wishlist')
      if (response.ok) {
        const data = await response.json()
        setWishlistItems(data)
      } else {
        throw new Error('Erreur lors du chargement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les favoris",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFromWishlist = async (productId: string, productName: string) => {
    setRemovingItems(prev => new Set(prev).add(productId))

    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setWishlistItems(prev => prev.filter(item => item.product.id !== productId))
        toast({
          title: "Retiré des favoris",
          description: `${productName} a été retiré de vos favoris`
        })
      } else {
        throw new Error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de retirer le produit des favoris",
        variant: "destructive"
      })
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const getProductTypeInfo = (type: ProductType) => {
    switch (type) {
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

  const removeAllFromWishlist = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous vos favoris ?')) {
      return
    }

    const promises = wishlistItems.map(item => 
      fetch(`/api/wishlist/${item.product.id}`, { method: 'DELETE' })
    )

    try {
      await Promise.all(promises)
      setWishlistItems([])
      toast({
        title: "Favoris supprimés",
        description: "Tous vos favoris ont été supprimés"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer tous les favoris",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de vos favoris...</p>
        </div>
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Heart className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-title mb-2">Aucun favori</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore ajouté de produits à vos favoris. 
              Explorez notre catalogue et cliquez sur le cœur pour ajouter vos produits préférés !
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/products">
              <Button size="lg" className="w-full">
                <Package className="h-5 w-5 mr-2" />
                Découvrir les produits
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            {wishlistItems.length} produit{wishlistItems.length > 1 ? 's' : ''} dans vos favoris
          </p>
        </div>
        
        {wishlistItems.length > 0 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={removeAllFromWishlist}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tout supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Liste des produits - Style simplifié */}
      <motion.div layout className="space-y-4">
        <AnimatePresence>
          {wishlistItems.map((item) => {
            const typeInfo = getProductTypeInfo(item.product.type)
            const isRemoving = removingItems.has(item.product.id)

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                whileHover={{ x: 4 }}
                className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex gap-4">
                  {/* Image du produit */}
                  <Link 
                    href={`/products/${item.product.id}`}
                    className="flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                  >
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">
                        {typeInfo.icon}
                      </div>
                    )}
                  </Link>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* En-tête produit */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.bgColor}`}>
                            {typeInfo.label}
                          </span>
                          {!item.product.available && (
                            <Badge variant="destructive" className="text-xs">
                              Indisponible
                            </Badge>
                          )}
                        </div>
                        
                        <Link href={`/products/${item.product.id}`}>
                          <h3 className="font-semibold text-lg mb-1 hover:text-custom-accent transition-colors line-clamp-1">
                            {item.product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.product.producer.companyName}
                        </p>

                        {item.product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {item.product.description}
                          </p>
                        )}

                        {/* Prix et infos */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-custom-accent">
                              {formatNumber(item.product.price)} CHF
                            </span>
                            <span className="text-muted-foreground">/ {item.product.unit}</span>
                          </div>

                          {item.product.stock && (
                            <span className="text-muted-foreground">
                              Stock: {formatNumber(item.product.stock.quantity)} {item.product.unit}
                            </span>
                          )}

                          {item.product.minOrderQuantity !== undefined && item.product.minOrderQuantity > 0 && (
                            <span className="text-muted-foreground">
                              Min: {formatNumber(item.product.minOrderQuantity)} {item.product.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Bouton voir le produit */}
                        <Link href={`/products/${item.product.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Voir le produit
                          </Button>
                        </Link>

                        {/* Bouton supprimer */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromWishlist(item.product.id, item.product.name)}
                          disabled={isRemoving}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isRemoving ? (
                            <LoadingSpinner className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date d'ajout */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Ajouté aux favoris le {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}