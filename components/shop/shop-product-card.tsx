// Chemin du fichier: components/shop/shop-product-card.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string
  price: number
  unit: string
  image: string | null
  available: boolean
  stock?: {
    quantity: number
  } | null
}

interface ShopProductCardProps {
  product: Product
  size?: 'small' | 'large'
}

export default function ShopProductCard({ product, size = 'small' }: ShopProductCardProps) {
  const [quantity, setQuantity] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(0, quantity + delta)
    setQuantity(newQty)
  }

  const handleAddToCart = async () => {
    if (!session) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter des produits au panier",
      })
      router.push('/login')
      return
    }

    if (quantity === 0) {
      setQuantity(1)
      return
    }

    try {
      setIsAdding(true)
      // API call pour ajouter au panier
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity
        })
      })

      if (!response.ok) throw new Error('Erreur')

      toast({
        title: "Produit ajouté",
        description: `${quantity} ${product.unit} de ${product.name} ajouté au panier`,
      })
      
      setQuantity(0)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter au panier",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="group">
      {/* Image */}
      <Link href={`/products/${product.id}`}>
        <div className={cn(
          "relative overflow-hidden rounded-2xl bg-gray-100 mb-4",
          size === 'small' ? "aspect-square" : "aspect-[4/3]"
        )}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🍄</div>
                <span className="text-sm">Pas d'image</span>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Info produit */}
      <div>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-black mb-1 hover:opacity-60 transition-opacity">
            {product.name}
          </h3>
        </Link>
        
        {/* Section prix et quantité avec bordure en pointillés */}
        <div className="border-t border-dashed border-black/20 pt-3 mt-3">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="w-8 h-8 border border-black/20 hover:border-black transition-colors flex items-center justify-center text-lg"
              disabled={quantity === 0}
            >
              -
            </button>
            
            <div className="text-center">
              <div className="text-sm font-light">
                {quantity > 0 ? `${quantity} ${product.unit}` : product.unit}
              </div>
              <div className="text-xs text-gray-500">
                {product.price} CHF/{product.unit}
              </div>
            </div>
            
            <button
              onClick={() => handleQuantityChange(1)}
              className="w-8 h-8 border border-black/20 hover:border-black transition-colors flex items-center justify-center text-lg"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}