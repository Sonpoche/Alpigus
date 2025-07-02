// components/layout/producer-menu.tsx
'use client'

import Link from 'next/link'
import { 
  Package, 
  ShoppingBag, 
  Settings, 
  BarChart4, 
  Truck,
  Users,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface ProducerMenuProps {
  currentPath: string
}

export default function ProducerMenu({ currentPath }: ProducerMenuProps) {
  const menuItems: MenuItem[] = [
    {
      href: '/producer',
      label: 'Produits',
      icon: <Package className="h-5 w-5" />
    },
    {
      href: '/producer/orders',
      label: 'Commandes',
      icon: <ShoppingBag className="h-5 w-5" />
    },
    {
      href: '/producer/delivery-slots/overview',
      label: 'Créneaux',
      icon: <Truck className="h-5 w-5" />
    },
    {
      href: '/producer/stats',
      label: 'Statistiques',
      icon: <BarChart4 className="h-5 w-5" />
    },
    {
      href: '/producer/wallet',
      label: 'Portefeuille',
      icon: <Wallet className="h-5 w-5" />
    },
    {
      href: '/producer/clients',
      label: 'Clients',
      icon: <Users className="h-5 w-5" />
    },
    {
      href: '/producer/settings',
      label: 'Paramètres',
      icon: <Settings className="h-5 w-5" />
    }
  ]

  // Fonction centralisée pour déterminer l'état actif
  const isActive = (href: string) => {
    if (href === '/producer') {
      // Pour la page producer principale, être exact sauf pour les sous-pages spécifiques
      return currentPath === '/producer' || (
        currentPath.startsWith('/producer/') && 
        !currentPath.startsWith('/producer/orders') &&
        !currentPath.startsWith('/producer/delivery-slots') &&
        !currentPath.startsWith('/producer/stats') &&
        !currentPath.startsWith('/producer/wallet') &&
        !currentPath.startsWith('/producer/clients') &&
        !currentPath.startsWith('/producer/settings')
      )
    }
    return currentPath.startsWith(href)
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