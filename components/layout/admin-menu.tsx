// components/layout/admin-menu.tsx
'use client'

import Link from 'next/link'
import { 
  LayoutDashboard, 
  Package, 
  Users,
  BarChart4,
  Tags,
  Gauge,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface AdminMenuProps {
  currentPath: string
}

export default function AdminMenu({ currentPath }: AdminMenuProps) {
  const menuItems: MenuItem[] = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      href: '/admin/users',
      label: 'Utilisateurs',
      icon: <Users className="h-5 w-5" />
    },
    {
      href: '/admin/products',
      label: 'Produits',
      icon: <Package className="h-5 w-5" />
    },
    {
      href: '/admin/wallets',
      label: 'Portefeuilles',
      icon: <Wallet className="h-5 w-5" />
    },
    {
      href: '/admin/orders/supervision',
      label: 'Supervision',
      icon: <Gauge className="h-5 w-5" />
    },
    {
      href: '/admin/categories',
      label: 'Catégories',
      icon: <Tags className="h-5 w-5" />
    },
    {
      href: '/admin/stats',
      label: 'Statistiques',
      icon: <BarChart4 className="h-5 w-5" />
    },
  ]

  // Fonction centralisée pour déterminer l'état actif
  const isActive = (href: string) => {
    if (href === '/admin') {
      // Pour la page admin principale, être exact
      return currentPath === '/admin'
    }
    // Pour les autres pages, vérifier si le chemin commence par l'href
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