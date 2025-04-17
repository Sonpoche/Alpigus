// components/layout/notification-bell.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Charger les notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications?limit=5')
      if (!response.ok) throw new Error('Erreur de chargement des notifications')
      
      const data = await response.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      setIsLoading(false)
    }
  }

  // Initialiser et configurer le polling des notifications
  useEffect(() => {
    fetchNotifications()
    
    // Configurer un polling pour vérifier les nouvelles notifications toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Marquer une notification comme lue
  const markAsRead = async (notification: Notification, navigate: boolean = true) => {
    try {
      if (notification.read) {
        if (navigate && notification.link) {
          handleNavigation(notification.link);
        }
        return;
      }
      
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH'
      })
      
      if (!response.ok) throw new Error('Erreur de mise à jour')
      
      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Naviguer si nécessaire
      if (navigate && notification.link) {
        handleNavigation(notification.link);
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // Helper pour gérer la navigation avec param de modal
  const handleNavigation = (link: string) => {
    // Si le lien contient un paramètre pour ouvrir une modal
    if (link.includes('?view=')) {
      const orderId = link.split('?view=')[1];
      // Stocker l'ID dans localStorage pour que la page de destination puisse l'utiliser
      window.localStorage.setItem('openOrderModal', orderId);
    } else if (link.includes('?edit=')) {
      const productId = link.split('?edit=')[1];
      // Stocker l'ID pour éditer un produit
      window.localStorage.setItem('editProduct', productId);
    }
    
    // Fermer le dropdown et naviguer
    setIsOpen(false);
    router.push(link);
  };
  
  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  // Obtenir l'icône appropriée pour le type de notification
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center"><Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
      case 'ORDER_STATUS_CHANGED':
        return <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center"><Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" /></div>
      case 'LOW_STOCK':
        return <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center"><Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
      default:
        return <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"><Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" /></div>
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        className="relative p-2 rounded-full hover:bg-foreground/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-foreground/10 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-foreground/10 flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            <Link 
              href="/notifications" 
              className="text-xs text-custom-accent hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Voir tout
            </Link>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-accent mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-foreground/5">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "p-3 hover:bg-foreground/5 cursor-pointer transition-colors",
                      !notification.read && "bg-foreground/5"
                    )}
                    onClick={() => markAsRead(notification)}
                  >
                    <div className="flex gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: fr
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-custom-accent rounded-full self-start mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-foreground/10 bg-foreground/5">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full p-2 text-sm text-center rounded hover:bg-foreground/10 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}