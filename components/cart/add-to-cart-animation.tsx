// components/cart/add-to-cart-animation.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, CheckCircle } from 'lucide-react'

interface AddToCartAnimationProps {
  isOpen: boolean
  onClose: () => void
  productName: string
  productImage?: string | null
}

export function AddToCartAnimation({ 
  isOpen, 
  onClose, 
  productName,
  productImage 
}: AddToCartAnimationProps) {
  
  useEffect(() => {
    if (isOpen) {
      // Fermer automatiquement après 2 secondes
      const timer = setTimeout(() => {
        onClose()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 bg-background border border-foreground/10 rounded-lg shadow-lg p-4 max-w-xs z-50 flex items-center gap-3"
        >
          <div className="relative w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">Ajouté au panier !</h4>
            <p className="text-xs text-muted-foreground truncate">{productName}</p>
          </div>
          
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: 1, duration: 0.7 }}
            className="w-8 h-8 bg-custom-accent rounded-full flex items-center justify-center text-white"
          >
            <ShoppingCart className="h-4 w-4" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}