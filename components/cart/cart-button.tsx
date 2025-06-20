// components/cart/cart-button.tsx - VERSION CORRIGÉE
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ClipboardCheck, Edit2, X, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface CartButtonProps {
  className?: string
}

export function CartButton({ className }: CartButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { cartSummary, cartId, refreshCart, removeFromCart } = useCart()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // Animation quand le panier est mis à jour et actualiser les données
  useEffect(() => {
    const handleCartUpdate = () => {
      // Mettre à jour immédiatement les données du panier
      refreshCart();
      
      // Animer l'icône du panier
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    };

    window.addEventListener('cart:updated', handleCartUpdate);
    return () => window.removeEventListener('cart:updated', handleCartUpdate);
  }, [refreshCart]);

  // Rafraîchir périodiquement le panier lorsque le dropdown est ouvert
  useEffect(() => {
    if (showDropdown) {
      // Rafraîchir immédiatement lors de l'ouverture
      refreshCart();
      
      // Mettre en place un intervalle pour les mises à jour périodiques
      const interval = setInterval(() => {
        refreshCart();
      }, 2000); // Rafraîchir toutes les 2 secondes
      
      return () => clearInterval(interval);
    }
  }, [showDropdown, refreshCart]);

  // Gestion du hover avec délai pour éviter la disparition instantanée
  const handleMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    if (cartSummary && cartSummary.itemCount > 0) {
      setShowDropdown(true);
      // Rafraîchir le panier quand on ouvre le dropdown
      refreshCart();
    }
  };

  const handleMouseLeave = () => {
    // Délai plus long avant de fermer le dropdown pour éviter le clignotement
    const timeout = setTimeout(() => {
      setShowDropdown(false);
    }, 500); // Augmenté de 300ms à 500ms
    setCloseTimeout(timeout);
  };

  // Fonction pour maintenir le dropdown ouvert quand on survole la zone complète
  const handleContainerMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  const handleContainerMouseLeave = () => {
    // Fermeture immédiate quand on quitte complètement la zone
    const timeout = setTimeout(() => {
      setShowDropdown(false);
    }, 200);
    setCloseTimeout(timeout);
  };

  // Fonction pour supprimer un élément du panier
  const handleRemoveItem = async (itemId: string) => {
    try {
      setDeletingItemId(itemId);
      const success = await removeFromCart(itemId);
      
      if (success) {
        toast({
          title: "Article supprimé",
          description: "L'article a été retiré de votre panier",
        });
        
        // Rafraîchir explicitement après suppression
        refreshCart();
      } else {
        throw new Error("Impossible de supprimer l'article");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive"
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        buttonRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="relative"
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={() => {
          if (cartSummary && cartSummary.itemCount > 0) {
            setShowDropdown(!showDropdown);
            if (!showDropdown) {
              refreshCart(); // Rafraîchir lorsqu'on ouvre manuellement
            }
          } else {
            // Si le panier est vide, aller directement à la page panier
            router.push('/cart');
          }
        }}
        onMouseEnter={handleMouseEnter}
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
              className="absolute -top-2 -right-2 bg-custom-accent text-white rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-xs font-semibold"
            >
              {cartSummary.itemCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown au survol - CORRIGÉ avec z-index plus élevé et positionnement fixe */}
      <AnimatePresence>
        {showDropdown && cartSummary && cartSummary.itemCount > 0 && cartId && (
          <>
            {/* Overlay pour capturer les clics en dehors */}
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
              style={{
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-foreground">Votre panier ({cartSummary.itemCount})</h3>
                <button 
                  onClick={() => setShowDropdown(false)}
                  className="p-1 rounded-full hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Liste des articles (limitée à 4) */}
              <div className="max-h-56 overflow-y-auto mb-3 divide-y divide-foreground/5 scrollbar-thin scrollbar-thumb-foreground/20 scrollbar-track-transparent">
                {cartSummary.items.slice(0, 4).map((item, index) => (
                  <div key={item.id || `temp-${index}`} className="flex items-center gap-3 py-3 group first:pt-0">
                    <div className="w-12 h-12 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
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
                      <p className="text-sm font-medium truncate text-foreground">{item.product.name}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.product.unit} × {item.price.toFixed(2)} CHF
                        </p>
                        <p className="text-xs font-medium text-foreground">{(item.quantity * item.price).toFixed(2)} CHF</p>
                      </div>
                    </div>
                    
                    {/* Bouton de suppression */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 text-foreground/40"
                      disabled={deletingItemId === item.id}
                      title="Supprimer cet article"
                    >
                      {deletingItemId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
                
                {cartSummary.items.length > 4 && (
                  <div className="text-xs text-center text-muted-foreground py-2 bg-foreground/5 rounded-md my-2">
                    +{cartSummary.items.length - 4} autres articles
                  </div>
                )}
              </div>
              
              {/* Total et boutons */}
              <div className="border-t border-foreground/10 pt-3 mb-4">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Total</span>
                  <span>{cartSummary.totalPrice.toFixed(2)} CHF</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  className="flex-1 py-2.5 px-3 text-sm text-center border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-foreground"
                  onClick={() => setShowDropdown(false)}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Edit2 className="h-4 w-4" /> Voir panier
                  </span>
                </Link>
                <Link
                  href={`/checkout/${cartId}`}
                  className="flex-1 py-2.5 px-3 text-sm text-center bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity"
                  onClick={() => setShowDropdown(false)}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4" /> Commander
                  </span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}