// components/layout/client-menu.tsx
'use client'

import Link from 'next/link'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  User,
  Heart,
  ClipboardList,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInvoiceContext } from '@/contexts/invoice-context'
import { NotificationBadge } from '@/components/ui/notification-badge'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface ClientMenuProps {
  currentPath: string
}

export default function ClientMenu({ currentPath }: ClientMenuProps) {
  const { pendingCount } = useInvoiceContext()
  
  const menuItems: MenuItem[] = [
    {
      href: '/dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      href: '/products',
      label: 'Catalogue',
      icon: <Package className="h-5 w-5" />
    },
    {
      href: '/orders',
      label: 'Mes commandes',
      icon: <ClipboardList className="h-5 w-5" />
    },
    {
      href: '/invoices',
      label: 'Mes factures',
      icon: <FileText className="h-5 w-5" />,
      badge: pendingCount
    },
    {
      href: '/cart',
      label: 'Panier',
      icon: <ShoppingBag className="h-5 w-5" />
    },
    {
      href: '/wishlist',
      label: 'Favoris',
      icon: <Heart className="h-5 w-5" />
    },
    {
      href: '/profile',
      label: 'Profil',
      icon: <User className="h-5 w-5" />
    },
  ]

  // Fonction centralisée pour déterminer l'état actif
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard'
    }
    return currentPath === href || currentPath.startsWith(`${href}/`)
  }

  return (
    <nav className="space-y-1 px-3 py-2">
      {menuItems.map((item) => {
        const active = isActive(item.href)
        
        return (
          <Link 
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
              active 
                ? "bg-custom-accentLight text-custom-accent shadow-sm" 
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <span className="mr-3">
              {item.icon}
            </span>
            {item.label}
            {/* Badge de notification */}
            {item.badge !== undefined && (
              <NotificationBadge 
                count={item.badge} 
                variant="sidebar"
              />
            )}
            {/* Indicateur simplifié sans animation */}
            {active && (
              <div className="ml-auto w-1 h-5 bg-custom-accent rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}