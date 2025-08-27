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

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Marquer une notification comme lue
  const markAsRead = async (notification: Notification, navigate: boolean = true) => {
    try {
      if (notification.read) {
        if (navigate && notification.link) {
          handleNavigation(notification.link)
        }
        return
      }
      
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH'
      })
      
      if (!response.ok) throw new Error('Erreur de mise à jour')
      
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      if (navigate && notification.link) {
        handleNavigation(notification.link)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleNavigation = (link: string) => {
    if (link.includes('?view=')) {
      const orderId = link.split('?view=')[1]
      window.localStorage.setItem('openOrderModal', orderId)
    }
    
    setIsOpen(false)
    router.push(link)
  }
  
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

  // Icône de notification minimaliste
  const getNotificationIcon = (type: string) => {
    return (
      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 bg-foreground rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-md shadow-hover z-50 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-medium text-foreground">Notifications</h3>
            <Link 
              href="/notifications" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Voir tout
            </Link>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-accent cursor-pointer transition-colors",
                      !notification.read && "bg-muted/30"
                    )}
                    onClick={() => markAsRead(notification)}
                  >
                    <div className="flex gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm line-clamp-2",
                          !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: fr
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-foreground rounded-full self-start mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}