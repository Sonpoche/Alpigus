// components/layout/admin-menu.tsx (mise à jour)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  Users,
  Briefcase,
  BarChart4,
  ShieldAlert,
  Tags,
  Gauge,
  Wallet
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
}

export default function AdminMenu() {
  const pathname = usePathname()
  
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
    {
      href: '/admin/settings',
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
            {isActive && (
              <motion.div
                layoutId="activeAdminNavIndicator"
                className="ml-auto w-1 h-5 bg-custom-accent rounded-full"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}