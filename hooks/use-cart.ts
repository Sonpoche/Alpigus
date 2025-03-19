// hooks/use-cart.ts
'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  image: string | null
  price: number
  unit: string
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
  const fetchCartSummary = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/orders/${id}/summary`, {
        cache: 'no-store'
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
  }
  
  // Ajouter un produit au panier
  const addToCart = async (product: Product, quantity: number) => {
    try {
      setIsLoading(true)
      
      // Si pas de panier, en créer un
      if (!cartId) {
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
      }
      
      // Ajouter le produit au panier
      const currentId = cartId || localStorage.getItem('currentOrderId')
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
        throw new Error('Erreur lors de l\'ajout au panier')
      }
      
      // Mettre à jour le résumé du panier
      await fetchCartSummary(currentId)
      
      // Déclencher l'événement de mise à jour du panier
      window.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { productId: product.id, quantity }
      }))
      
      return true
    } catch (error) {
      console.error('Erreur:', error)
      return false
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
      
      // Mettre à jour le résumé du panier
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
  
  return {
    cartId,
    cartSummary,
    isLoading,
    addToCart,
    removeFromCart,
    refreshCart: () => cartId && fetchCartSummary(cartId)
  }
}