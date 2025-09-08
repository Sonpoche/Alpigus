// Chemin du fichier: hooks/use-local-cart.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
  unit: string
  image?: string
  type?: string
}

interface LocalCartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getItem: (productId: string) => CartItem | undefined
}

export const useLocalCart = create<LocalCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item: CartItem) => set((state) => {
        const existingItem = state.items.find(i => i.productId === item.productId)
        
        if (existingItem) {
          return {
            items: state.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          }
        }
        
        return { items: [...state.items, item] }
      }),
      
      updateQuantity: (productId: string, quantity: number) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter(i => i.productId !== productId)
          : state.items.map(i =>
              i.productId === productId ? { ...i, quantity } : i
            )
      })),
      
      removeItem: (productId: string) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId)
      })),
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        const state = get()
        return state.items.reduce((sum, item) => sum + item.quantity, 0)
      },
      
      getTotalPrice: () => {
        const state = get()
        return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      },
      
      getItem: (productId: string) => {
        const state = get()
        return state.items.find(i => i.productId === productId)
      }
    }),
    {
      name: 'mushroom-cart-storage',
      skipHydration: true
    }
  )
)