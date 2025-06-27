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
  
  // Charger l'ID du panier depuis le localStorage
  useEffect(() => {
    const storedCartId = localStorage.getItem('currentOrderId')
    if (storedCartId) {
      setCartId(storedCartId)
      fetchCartSummary(storedCartId)
    }
  }, [])
  
  // Récupérer le résumé du panier
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
    } finally {
      setIsLoading(false)
    }
  }, [])
  
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
      }, 100)
      
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
    }
  }, [cartId, fetchCartSummary]);
  
  return {
    cartId,
    cartSummary,
    isLoading,
    addToCart,
    removeFromCart,
    refreshCart
  }
}