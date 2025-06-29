// components/layout/client-menu.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useInvoiceContext } from '@/contexts/invoice-context'
import { NotificationBadge } from '@/components/ui/notification-badge'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export default function ClientMenu() {
  const pathname = usePathname()
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
    {
      href: '/settings',
      label: 'Paramètres',
      icon: <Settings className="h-5 w-5" />
    }
  ]

  return (
    <nav className="space-y-1 px-3 py-2">
      {menuItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        
        return (
          <Link 
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
              isActive 
                ? "bg-custom-accentLight text-custom-accent" 
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <span className="mr-3">
              {item.icon}
            </span>
            {item.label}
            {/* Simplification : le composant NotificationBadge gère déjà le cas count <= 0 */}
            {item.badge !== undefined && (
              <NotificationBadge 
                count={item.badge} 
                variant="sidebar"
              />
            )}
            {isActive && (
              <motion.div
                layoutId="activeClientNavIndicator"
                className="ml-auto w-1 h-5 bg-custom-accent rounded-full"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}