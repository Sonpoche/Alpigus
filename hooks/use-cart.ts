// hooks/use-cart.ts - VERSION CORRIGÉE
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Product {
  id: string
  name: string
  image: string | null
  price: number
  unit: string
  minOrderQuantity?: number
  acceptDeferred?: boolean
}

interface CartItem {
  id: string
  quantity: number
  price: number
  product: Product
}

interface CartSummary {
  itemCount: number
  items: CartItem[]
  totalPrice: number
}

export function useCart() {
  const [cartId, setCartId] = useState<string | null>(null)
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Récupérer le résumé du panier - déclaré en premier
  const fetchCartSummary = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/orders/${id}/summary`, {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem('currentOrderId')
          setCartId(null)
          setCartSummary(null)
          return
        }
        throw new Error('Erreur lors de la récupération du panier')
      }
      
      const data = await response.json()
      setCartSummary(data)
    } catch (error) {
      console.error('Erreur:', error)
      // ✅ NOUVEAU: En cas d'erreur, vérifier si le panier existe toujours
      const storedCartId = localStorage.getItem('currentOrderId')
      if (!storedCartId) {
        setCartId(null)
        setCartSummary(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Charger l'ID du panier depuis le localStorage
  useEffect(() => {
    const storedCartId = localStorage.getItem('currentOrderId')
    if (storedCartId) {
      setCartId(storedCartId)
      fetchCartSummary(storedCartId)
    }
  }, [fetchCartSummary])
  
  // ✅ NOUVEAU: Écouter la création d'un nouveau panier
  useEffect(() => {
    const handleNewCart = (event: CustomEvent) => {
      const newCartId = event.detail?.cartId
      if (newCartId && newCartId !== cartId) {
        console.log('🆕 New cart created:', newCartId)
        setCartId(newCartId)
        fetchCartSummary(newCartId)
      }
    }
    
    window.addEventListener('cart:created', handleNewCart as EventListener)
    
    return () => {
      window.removeEventListener('cart:created', handleNewCart as EventListener)
    }
  }, [cartId, fetchCartSummary])
  
  // ✅ NOUVEAU: Écouter l'événement cart:cleared pour vider l'état local
  useEffect(() => {
    const handleCartCleared = () => {
      console.log('🧹 useCart: Cart cleared event received')
      // Vider l'état local immédiatement
      setCartId(null)
      setCartSummary(null)
      // Vérifier que le localStorage est bien vide
      localStorage.removeItem('currentOrderId')
    }
    
    window.addEventListener('cart:cleared', handleCartCleared)
    
    return () => {
      window.removeEventListener('cart:cleared', handleCartCleared)
    }
  }, [])
  
  // ✅ NOUVEAU: Surveiller les changements du localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const storedCartId = localStorage.getItem('currentOrderId')
      if (!storedCartId && cartId) {
        // Le localStorage a été vidé, vider l'état local aussi
        console.log('🧹 useCart: localStorage cleared, clearing local state')
        setCartId(null)
        setCartSummary(null)
      } else if (storedCartId && storedCartId !== cartId) {
        // Un nouveau panier a été créé
        setCartId(storedCartId)
        fetchCartSummary(storedCartId)
      }
    }
    
    // Écouter les changements de localStorage (utile si plusieurs onglets sont ouverts)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [cartId, fetchCartSummary])
  
  // ✅ CORRECTION: Ajouter un produit au panier avec toast intégré
  const addToCart = async (product: Product, quantity: number) => {
    try {
      setIsLoading(true)
      
      // Vérifier la quantité minimale
      if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
        throw new Error(`La quantité minimale pour ce produit est de ${product.minOrderQuantity} ${product.unit}`)
      }
      
      // Si pas de panier, en créer un
      let currentId = cartId
      if (!currentId) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] })
        })
        
        if (!response.ok) {
          throw new Error('Erreur lors de la création du panier')
        }
        
        const data = await response.json()
        localStorage.setItem('currentOrderId', data.id)
        setCartId(data.id)
        currentId = data.id
        
        // ✅ NOUVEAU: Déclencher un événement pour notifier la création du panier
        window.dispatchEvent(new CustomEvent('cart:created', {
          detail: { cartId: data.id }
        }))
      }
      
      // Ajouter le produit au panier
      if (!currentId) throw new Error('Erreur d\'identification du panier')
      
      const response = await fetch('/api/orders/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentId,
          productId: product.id,
          quantity
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erreur lors de l\'ajout au panier')
      }
      
      // ✅ CORRECTION: Récupérer les données AVANT de déclencher les événements
      await fetchCartSummary(currentId)
      
      // ✅ NOUVEAU: Attendre un peu plus longtemps lors de la première création
      const delay = !cartId ? 300 : 100
      
      // ✅ CORRECTION: Déclencher les événements avec un petit délai pour s'assurer que tout est à jour
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { 
            productId: product.id, 
            quantity,
            productName: product.name,
            productUnit: product.unit
          }
        }))
        
        // ✅ NOUVEAU: Déclencher aussi cart:item-added pour être sûr
        window.dispatchEvent(new CustomEvent('cart:item-added', {
          detail: { 
            productId: product.id, 
            quantity,
            productName: product.name,
            productUnit: product.unit
          }
        }))
      }, delay)
      
      return true
    } catch (error: any) {
      console.error('Erreur:', error)
      throw error // ✅ CORRECTION: Relancer l'erreur pour que le composant puisse la gérer
    } finally {
      setIsLoading(false)
    }
  }

  // Supprimer un article du panier
  const removeFromCart = async (itemId: string) => {
    if (!cartId) return false;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Erreur HTTP:', response.status, await response.text());
        throw new Error('Erreur lors de la suppression de l\'article');
      }
      
      // Après une suppression réussie, toujours récupérer les données à jour
      await fetchCartSummary(cartId);
      
      // Déclencher l'événement de mise à jour du panier
      window.dispatchEvent(new CustomEvent('cart:updated'));
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshCart = useCallback(() => {
    if (cartId) {
      fetchCartSummary(cartId);
    } else {
      // ✅ NOUVEAU: Si pas de cartId, s'assurer que le state est bien vide
      setCartSummary(null);
    }
  }, [cartId, fetchCartSummary]);
  
  // ✅ NOUVEAU: Fonction pour vider complètement le panier (utile pour les tests)
  const clearCart = useCallback(() => {
    localStorage.removeItem('currentOrderId')
    setCartId(null)
    setCartSummary(null)
    window.dispatchEvent(new CustomEvent('cart:cleared'))
  }, [])
  
  return {
    cartId,
    cartSummary,
    isLoading,
    addToCart,
    removeFromCart,
    refreshCart,
    clearCart // ✅ NOUVEAU: Exposer la fonction clearCart
  }
}