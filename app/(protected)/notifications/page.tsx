// app/(protected)/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Filter, Check, X, RefreshCw } from 'lucide-react'
import { Notification, NotificationType } from '@/types/notification'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const router = useRouter()

  // Charger les notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications${activeFilter === 'unread' ? '?unread=true' : ''}`)
      if (!response.ok) throw new Error('Erreur de chargement des notifications')
      
      const data = await response.json()
      setNotifications(data.notifications)
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      setIsLoading(false)
    }
  }

  // Initialiser
  useEffect(() => {
    fetchNotifications()
  }, [activeFilter])
  
  // Marquer une notification comme lue
  const markAsRead = async (notification: Notification, navigate: boolean = true) => {
    try {
      if (notification.read) {
        if (navigate && notification.link) {
          // Vérifier si c'est un lien de commande en ancien format
          if (notification.link.startsWith('/producer/orders/')) {
            // Convertir l'ancien format en nouveau format à la volée
            const orderId = notification.link.split('/').pop();
            router.push(`/producer/orders?modal=${orderId}`);
          } else {
            router.push(notification.link);
          }
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
      
      // Naviguer si nécessaire
      if (navigate && notification.link) {
        // Même logique pour la conversion des liens
        if (notification.link.startsWith('/producer/orders/')) {
          const orderId = notification.link.split('/').pop();
          router.push(`/producer/orders?modal=${orderId}`);
        } else {
          router.push(notification.link);
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }
  
  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Erreur de mise à jour')
      
      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  // Obtenir l'icône et la couleur pour chaque type de notification
  const getNotificationDetails = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_ORDER:
        return {
          icon: <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400'
        }
      case NotificationType.ORDER_STATUS_CHANGED:
        return {
          icon: <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400'
        }
      case NotificationType.LOW_STOCK:
        return {
          icon: <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
          bgColor: 'bg-amber-100 dark:bg-amber-900/20',
          textColor: 'text-amber-600 dark:text-amber-400'
        }
      default:
        return {
          icon: <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400'
        }
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Consultez toutes vos notifications et mises à jour
        </p>
      </div>
      
      {/* Filtres et actions */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium",
              activeFilter === null
                ? "bg-custom-accent text-white"
                : "bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
            )}
          >
            <Filter className="h-4 w-4 mr-1 inline-block" />
            Toutes
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium",
              activeFilter === 'unread'
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                : "bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
            )}
          >
            <Bell className="h-4 w-4 mr-1 inline-block" />
            Non lues
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-foreground/5 hover:bg-foreground/10 transition-colors flex items-center"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Actualiser
          </button>
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-foreground/5 hover:bg-foreground/10 transition-colors flex items-center"
          >
            <Check className="h-4 w-4 mr-1" />
            Tout marquer comme lu
          </button>
        </div>
      </div>
      
      {/* Liste des notifications */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-foreground/10">
            {notifications.map(notification => {
              const { icon, bgColor, textColor } = getNotificationDetails(notification.type as NotificationType);
              // Convertir le lien si nécessaire pour l'affichage
              const displayLink = notification.link?.startsWith('/producer/orders/') 
                ? `/producer/orders?modal=${notification.link.split('/').pop()}`
                : notification.link;
                
              return (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-foreground/5 cursor-pointer transition-colors",
                    !notification.read && "bg-foreground/5"
                  )}
                  onClick={() => markAsRead(notification)}
                >
                  <div className="flex gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", bgColor)}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={cn(
                          "font-medium",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: fr
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}
                        </span>
                        {displayLink && (
                          <Link
                            href={displayLink}
                            className={cn("text-xs hover:underline", textColor)}
                            onClick={e => {
                              e.stopPropagation();
                              markAsRead(notification, true);
                            }}
                          >
                            Voir les détails
                          </Link>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-custom-accent rounded-full self-start mt-2"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg p-12 text-center">
          <Bell className="h-20 w-20 mx-auto text-muted-foreground mb-6 opacity-20" />
          <h2 className="text-2xl font-medium mb-2">Aucune notification</h2>
          <p className="text-muted-foreground mb-4">
            {activeFilter === 'unread'
              ? "Vous n'avez aucune notification non lue."
              : "Vous n'avez pas encore reçu de notification."}
          </p>
        </div>
      )}
    </div>
  )
}