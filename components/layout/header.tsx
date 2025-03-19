// components/layout/header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Store, Bell, Menu, X, Home } from 'lucide-react'
import { useState } from 'react'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'
import { CartButton } from '../cart/cart-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Ajout de l'accueil dans tous les navItems
const clientNavItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/products', label: 'Parcourir les produits' }, // ou simplement 'Produits'
  { href: '/reservations', label: 'Réservations' },
  { href: '/orders', label: 'Mes Commandes' },
]

const producerNavItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/producer/dashboard', label: 'Tableau de bord' },
  { href: '/producer/products', label: 'Mes Produits' },
  { href: '/producer/orders', label: 'Commandes' },
]

const adminNavItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/admin/dashboard', label: 'Tableau de bord' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/products', label: 'Produits' },
]

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const getNavItems = () => {
    switch (session?.user?.role) {
      case 'ADMIN':
        return adminNavItems
      case 'PRODUCER':
        return producerNavItems
      default:
        return clientNavItems
    }
  }

  const navItems = getNavItems()
  const isActiveLink = (href: string) => pathname === href
  const isClient = session?.user?.role === 'CLIENT' || !session?.user?.role

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background">
      <div className="w-full px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo et navigation principale */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-custom-title font-montserrat">
                🍄 MushRoom
              </span>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-custom-accent flex items-center gap-2
                    ${isActiveLink(item.href) ? 'text-custom-accent' : 'text-custom-text'}`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {session?.user?.role === 'PRODUCER' && (
              <Link href="/producer/store" className="text-custom-text hover:text-custom-accent">
                <Store className="h-5 w-5" />
              </Link>
            )}
            
            {isClient && (
              <CartButton />
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger className="text-custom-text hover:text-custom-accent">
                <Bell className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  Pas de nouvelles notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
            <UserMenu />
          </div>

          {/* Menu Mobile */}
          <div className="flex md:hidden items-center gap-4">
            {isClient && (
              <CartButton />
            )}
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-custom-text hover:text-custom-accent"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-foreground/10">
            <nav className="space-y-1 px-2 pb-3 pt-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium ${
                    isActiveLink(item.href)
                      ? 'bg-custom-accent text-white'
                      : 'text-custom-text hover:bg-foreground/5'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-foreground/10 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <UserMenu />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}