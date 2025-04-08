// components/producer/new-orders-alert.tsx
'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Order } from '@/types/order'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion } from 'framer-motion'

export function NewOrdersAlert() {
  const [newOrders, setNewOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Charger les commandes récentes (des dernières 24h)
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setIsLoading(true)
        
        // Récupérer les commandes du producteur avec le statut "PENDING"
        const response = await fetch('/api/orders/producer?status=PENDING')
        if (!response.ok) throw new Error('Erreur de chargement des commandes')
        
        const data = await response.json()
        
        // Filtrer pour ne garder que les commandes des dernières 24 heures
        const oneDayAgo = new Date()
        oneDayAgo.setHours(oneDayAgo.getHours() - 24)
        
        const recentOrders = data.filter((order: Order) => 
          new Date(order.createdAt) > oneDayAgo
        )
        
        setNewOrders(recentOrders)
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setIsLoading(false)
      }
    }
    
    fetchRecentOrders()
    
    // Actualiser toutes les 2 minutes
    const interval = setInterval(fetchRecentOrders, 120000)
    return () => clearInterval(interval)
  }, [])
  
  if (isLoading) return null
  if (newOrders.length === 0) return null
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-blue-800 dark:text-blue-300">
            {newOrders.length === 1 
              ? '1 nouvelle commande' 
              : `${newOrders.length} nouvelles commandes`}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {newOrders.length === 1 
              ? `Reçue ${formatDistanceToNow(new Date(newOrders[0].createdAt), { 
                  addSuffix: true, 
                  locale: fr 
                })}`
              : 'Reçues au cours des dernières 24 heures'
            }
          </p>
        </div>
        <Link 
          href="/producer/orders?status=PENDING" 
          className="ml-auto text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          Voir les commandes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  )
}