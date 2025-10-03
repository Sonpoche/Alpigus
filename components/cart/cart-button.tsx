// Chemin du fichier: components/cart/cart-button.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ClipboardCheck, Edit2, X, Trash2, Loader2, ChevronRight } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { useLocalCart } from '@/hooks/use-local-cart'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { formatNumber } from '@/lib/number-utils'

interface CartButtonProps {
  className?: string
  variant?: 'public' | 'protected' // Nouveau prop pour différencier les contextes
}

export function CartButton({ className, variant = 'protected' }: CartButtonProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { cartSummary, cartId, refreshCart, removeFromCart } = useCart()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [serverOrder, setServerOrder] = useState<any>(null)

  // Panier local pour version publique
  const localItems = useLocalCart((state) => state.items)
  const removeLocalItem = useLocalCart((state) => state.removeItem)
  const getLocalTotalPrice = useLocalCart((state) => state.getTotalPrice)

  // Hydrater après le montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
    setMounted(true)
  }, [])

  // Charger les données serveur si connecté (pour version publique)
  useEffect(() => {
    if (variant === 'public' && session && mounted) {
      fetchServerOrder()
    }
  }, [variant, session, mounted])

  const fetchServerOrder = async () => {
    const currentOrderId = localStorage.getItem('currentOrderId')
    if (!currentOrderId) return

    try {
      const response = await fetch(`/api/orders/${currentOrderId}`, {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setServerOrder(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // Déterminer quelles données utiliser selon le variant et la connexion
  const getCartData = () => {
    if (variant === 'protected') {
      // Version protégée : utilise toujours useCart
      return {
        items: cartSummary?.items || [],
        itemCount: cartSummary?.itemCount || 0,
        totalPrice: cartSummary?.totalPrice || 0,
        cartId: cartId
      }
    } else {
      // Version publique : adapte selon la connexion
      if (session && serverOrder) {
        return {
          items: serverOrder.items || [],
          itemCount: serverOrder.items?.length || 0,
          totalPrice: serverOrder.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0,
          cartId: serverOrder.id
        }
      } else {
        return {
          items: localItems,
          itemCount: localItems.length,
          totalPrice: getLocalTotalPrice(),
          cartId: null
        }
      }
    }
  }

  const { items, itemCount, totalPrice, cartId: currentCartId } = getCartData()

  // Gestion des événements de mise à jour du panier
  useEffect(() => {
    const handleCartUpdate = (event?: CustomEvent) => {
      console.log('Cart update event received:', event?.detail)
      
      // Ouvrir automatiquement le dropdown quand on ajoute un produit
      if (event?.detail?.productId) {
        setShowDropdown(true)
        
        // Fermer automatiquement après 4 secondes
        setTimeout(() => {
          setShowDropdown(false)
        }, 4000)
      }
      
      // Refresh selon le variant
      if (variant === 'protected') {
        refreshCart()
        setTimeout(() => refreshCart(), 500)
      } else if (variant === 'public' && session) {
        setTimeout(() => fetchServerOrder(), 300)
      }
      
      // Animer l'icône du panier
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }

    const handleCartCreated = (event?: CustomEvent) => {
      console.log('Cart created event received:', event?.detail)
      
      if (variant === 'protected') {
        refreshCart()
        setTimeout(() => refreshCart(), 200)
      } else if (variant === 'public' && session) {
        setTimeout(() => fetchServerOrder(), 200)
      }
    }

    const handleCartCleared = () => {
      console.log('Cart cleared event received')
      
      setShowDropdown(false)
      
      if (variant === 'protected') {
        refreshCart()
        setTimeout(() => refreshCart(), 200)
      } else if (variant === 'public' && session) {
        setTimeout(() => fetchServerOrder(), 200)
      }
      
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }

    window.addEventListener('cart:updated', handleCartUpdate as EventListener)
    window.addEventListener('cart:item-added', handleCartUpdate as EventListener)
    window.addEventListener('cart:item-removed', handleCartUpdate as EventListener)
    window.addEventListener('cart:created', handleCartCreated as EventListener)
    window.addEventListener('cart:cleared', handleCartCleared as EventListener)
    
    return () => {
      window.removeEventListener('cart:updated', handleCartUpdate as EventListener)
      window.removeEventListener('cart:item-added', handleCartUpdate as EventListener)
      window.removeEventListener('cart:item-removed', handleCartUpdate as EventListener)
      window.removeEventListener('cart:created', handleCartCreated as EventListener)
      window.removeEventListener('cart:cleared', handleCartCleared as EventListener)
    }
  }, [variant, session, refreshCart])

  // Refresh initial et périodique (pour version protégée)
  useEffect(() => {
    if (variant === 'protected' && currentCartId) {
      refreshCart()
      
      const interval = setInterval(() => {
        refreshCart()
      }, 10000)
      
      return () => clearInterval(interval)
    }
  }, [variant, currentCartId, refreshCart])

  // Gestion du hover
  const handleMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    if (itemCount > 0) {
      setShowDropdown(true)
      if (variant === 'protected') {
        setTimeout(() => refreshCart(), 100)
      }
    }
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowDropdown(false)
    }, 500)
    setCloseTimeout(timeout)
  }

  const handleContainerMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
  }

  const handleContainerMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
    setCloseTimeout(timeout)
  }

  // Fonction de suppression adaptée
  const handleRemoveItem = async (itemId: string, productName: string) => {
    try {
      setDeletingItemId(itemId)
      
      if (variant === 'protected') {
        // Version protégée : utilise useCart
        const success = await removeFromCart(itemId)
        if (!success) throw new Error("Impossible de supprimer l'article")
        
        refreshCart()
        setTimeout(() => refreshCart(), 300)
        
        window.dispatchEvent(new CustomEvent('cart:item-removed', {
          detail: { itemId, timestamp: Date.now() }
        }))
      } else {
        // Version publique : adapte selon la connexion
        if (session && serverOrder) {
          const response = await fetch(`/api/orders/items/${itemId}`, {
            method: 'DELETE'
          })
          
          if (!response.ok) throw new Error('Erreur lors de la suppression')
          setTimeout(() => fetchServerOrder(), 300)
        } else {
          removeLocalItem(itemId)
        }
      }
      
      toast({
        title: "Article supprimé",
        description: `${productName} a été retiré de votre panier`,
        duration: 2000,
      })
      
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setDeletingItemId(null)
    }
  }

  // Gestion du checkout
  const handleCheckout = async () => {
    if (status === 'loading') return

    if (!session) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour finaliser votre commande"
      })
      router.push('/connexion?callbackUrl=/panier&checkout=true')
      return
    }

    if (variant === 'protected' && currentCartId) {
      router.push(`/checkout/${currentCartId}`)
      return
    }

    if (variant === 'public') {
      if (serverOrder) {
        router.push(`/commande/${serverOrder.id}`)
        return
      }

      // Synchroniser panier local
      try {
        const response = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: localItems })
        })

        if (response.ok) {
          const data = await response.json()
          router.push(`/commande/${data.orderId}`)
        } else {
          throw new Error('Erreur de synchronisation')
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de synchroniser le panier",
          variant: "destructive"
        })
      }
    }
  }

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        buttonRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) return null

  return (
    <div 
      className="relative"
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={() => {
          if (itemCount > 0) {
            setShowDropdown(!showDropdown)
            if (!showDropdown && variant === 'protected') {
              refreshCart()
              setTimeout(() => refreshCart(), 200)
            }
          } else {
            router.push('/panier')
          }
        }}
        onMouseEnter={handleMouseEnter}
        className={`relative p-2 rounded-md hover:bg-foreground/5 transition-colors ${className}`}
        aria-label="Panier"
      >
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <ShoppingCart className="h-5 w-5" />
        </motion.div>

        <AnimatePresence>
          {itemCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 bg-custom-accent text-white rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-xs font-semibold"
            >
              {itemCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && itemCount > 0 && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            />
            
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background border border-foreground/10 rounded-lg shadow-xl z-50 p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-foreground">
                  Votre panier ({itemCount})
                </h3>
                <button 
                  onClick={() => setShowDropdown(false)}
                  className="p-1 rounded-full hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="max-h-56 overflow-y-auto mb-3 divide-y divide-foreground/5">
                {items.slice(0, 4).map((item: any, index: number) => {
                  const isServerItem = 'product' in item
                  const itemId = isServerItem ? item.id : item.productId
                  const productName = isServerItem ? item.product.name : item.productName
                  const productImage = isServerItem ? item.product.image : item.image
                  const productUnit = isServerItem ? item.product.unit : item.unit
                  const price = item.price
                  const quantity = item.quantity
                  
                  return (
                    <div key={`${itemId}-${index}`} className="flex items-center gap-3 py-3 group first:pt-0">
                      <div className="w-12 h-12 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                        {productImage ? (
                          <Image
                            src={productImage}
                            alt={productName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-foreground/30">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{productName}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">
                            {formatNumber ? formatNumber(quantity) : quantity.toFixed(1)} {productUnit} × {formatNumber ? formatNumber(price) : price.toFixed(2)} CHF
                          </p>
                          <p className="text-xs font-medium text-foreground">
                            {formatNumber ? formatNumber(quantity * price) : (quantity * price).toFixed(2)} CHF
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveItem(itemId, productName)
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 text-foreground/40"
                        disabled={deletingItemId === itemId}
                      >
                        {deletingItemId === itemId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )
                })}
                
                {items.length > 4 && (
                  <div className="text-xs text-center text-muted-foreground py-2 bg-foreground/5 rounded-md my-2">
                    +{items.length - 4} autres articles
                  </div>
                )}
              </div>
              
              <div className="border-t border-foreground/10 pt-3 mb-4">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Total</span>
                  <span>{formatNumber ? formatNumber(totalPrice) : totalPrice.toFixed(2)} CHF</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link
                  href="/panier"
                  className="flex-1 py-2.5 px-3 text-sm text-center border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-foreground"
                  onClick={() => setShowDropdown(false)}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Edit2 className="h-4 w-4" /> Voir panier
                  </span>
                </Link>
                <button
                  onClick={handleCheckout}
                  className="flex-1 py-2.5 px-3 text-sm text-center bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                >
                  {session ? (
                    <>
                      <ClipboardCheck className="h-4 w-4" /> Commander
                    </>
                  ) : (
                    <>
                      Se connecter <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}