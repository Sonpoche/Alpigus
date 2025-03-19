// components/cart/cart-button.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ClipboardCheck, Edit2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface CartButtonProps {
  className?: string
}

export function CartButton({ className }: CartButtonProps) {
  const router = useRouter()
  const { cartSummary, cartId, refreshCart } = useCart()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Animation quand le panier est mis à jour
  useEffect(() => {
    const handleCartUpdate = () => {
      refreshCart();
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    };

    window.addEventListener('cart:updated', handleCartUpdate);
    return () => window.removeEventListener('cart:updated', handleCartUpdate);
  }, [refreshCart]);

  return (
    <div className="relative">
      <button
        onClick={() => cartSummary && cartSummary.itemCount > 0 && setShowDropdown(!showDropdown)}
        onMouseEnter={() => cartSummary && cartSummary.itemCount > 0 && setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
        className={`relative p-2 rounded-md hover:bg-foreground/5 transition-colors ${className}`}
        aria-label="Panier"
      >
        {/* Icône du panier avec animation */}
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <ShoppingCart className="h-5 w-5" />
        </motion.div>

        {/* Indicateur du nombre d'articles */}
        <AnimatePresence>
          {cartSummary && cartSummary.itemCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 bg-custom-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold"
            >
              {cartSummary.itemCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown au survol */}
      <AnimatePresence>
        {showDropdown && cartSummary && cartSummary.itemCount > 0 && cartId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
            className="absolute top-full right-0 mt-2 w-72 bg-background border border-foreground/10 rounded-lg shadow-lg z-50 p-4"
          >
            <h3 className="font-medium mb-2">Votre panier ({cartSummary.itemCount})</h3>
            
            {/* Liste des articles (limitée à 3) */}
            <div className="max-h-48 overflow-auto mb-3">
              {cartSummary.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0">
                  <div className="w-10 h-10 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/30">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                  </div>
                </div>
              ))}
              
              {cartSummary.items.length > 3 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  +{cartSummary.items.length - 3} autres articles
                </p>
              )}
            </div>
            
            {/* Message d'information */}
            <p className="text-xs text-muted-foreground mb-3 italic">
              Pour gérer ou supprimer un article, veuillez vous rendre à la page du panier.
            </p>
            
            {/* Total et boutons */}
            <div className="border-t border-foreground/10 pt-2 mb-3">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{cartSummary.totalPrice.toFixed(2)} CHF</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link
                href="/cart"
                className="flex-1 py-2 px-3 text-sm text-center border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
              >
                <span className="flex items-center justify-center gap-1">
                  <Edit2 className="h-4 w-4" /> Gérer panier
                </span>
              </Link>
              <Link
                href={`/checkout/${cartId}`}
                className="flex-1 py-2 px-3 text-sm text-center bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center justify-center gap-1">
                  <ClipboardCheck className="h-4 w-4" /> Commander
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}