// hooks/use-cart.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

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
  
  // Ajouter un produit au panier
  const addToCart = async (product: Product, quantity: number) => {
    try {
      setIsLoading(true)
      
      // Si pas de panier, en créer un
      let currentId = cartId
      if (!currentId) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] }) // Créer un panier vide
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
        const errorText = await response.text();
        throw new Error(errorText || 'Erreur lors de l\'ajout au panier')
      }
      
      // Mettre à jour localement le panier pour une réponse immédiate
      if (cartSummary) {
        // Vérifier si le produit existe déjà dans le panier
        const existingItemIndex = cartSummary.items.findIndex(item => 
          item.product.id === product.id
        )
        
        let updatedItems = [...cartSummary.items]
        
        if (existingItemIndex >= 0) {
          // Mettre à jour la quantité d'un produit existant
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity
          }
        } else {
          // Ajouter un nouveau produit
          // Note: on utilise un ID temporaire qui sera remplacé lors du prochain fetchCartSummary
          updatedItems.push({
            id: `temp-${Date.now()}`,
            quantity,
            price: product.price,
            product
          })
        }
        
        // Mettre à jour le résumé du panier
        setCartSummary({
          itemCount: updatedItems.length,
          items: updatedItems,
          totalPrice: updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0)
        })
      } else {
        // Si c'est le premier produit, initialiser le résumé
        setCartSummary({
          itemCount: 1,
          items: [{
            id: `temp-${Date.now()}`,
            quantity,
            price: product.price,
            product
          }],
          totalPrice: product.price * quantity
        })
      }
      
      // Puis mettre à jour les données réelles (en arrière-plan)
      fetchCartSummary(currentId)
      
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
      
      // Mettre à jour localement le panier
      if (cartSummary) {
        const itemToRemove = cartSummary.items.find(item => item.id === itemId);
        if (itemToRemove) {
          const updatedItems = cartSummary.items.filter(item => item.id !== itemId);
          setCartSummary({
            itemCount: updatedItems.length,
            items: updatedItems,
            totalPrice: updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0)
          });
        }
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