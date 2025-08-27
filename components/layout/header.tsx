// components/layout/header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Search, ShoppingBag, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'
import { CartButton } from '../cart/cart-button'
import { motion, AnimatePresence } from 'framer-motion'
import { NotificationBell } from './notification-bell'
import { cn } from '@/lib/utils'

// Navigation horizontale par rôle (style référence)
const clientNavItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/products', label: 'Mes produits' }, 
  { href: '/orders', label: 'Commandes' },
  { href: '/invoices', label: 'Factures' },
]

const producerNavItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/producer', label: 'Mes produits' },
  { href: '/producer/orders', label: 'Commandes' },
  { href: '/producer/delivery-slots/overview', label: 'Livraisons' },
  { href: '/producer/stats', label: 'Archive' },
  { href: '/producer/wallet', label: 'Blog' },
]

const adminNavItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/admin', label: 'Administration' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/products', label: 'Produits' },
  { href: '/admin/stats', label: 'Statistiques' },
]

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrolled])
  
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
  const isActiveLink = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  const isClient = session?.user?.role === 'CLIENT' || !session?.user?.role

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearchOpen(false)
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <>
      <header className="w-full py-4">
        <div className={cn(
          "mx-4 sm:mx-6 lg:mx-8 border-t border-b border-border bg-background transition-all duration-200",
          scrolled && 'shadow-minimal'
        )}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo - exactement comme sur la référence */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                {/* Logo minimaliste - 2 cercles exactement comme image */}
                <div className="flex items-center gap-1 mr-4">
                  <div className="w-7 h-7 bg-foreground rounded-full"></div>
                  <div className="w-5 h-5 bg-background border-2 border-foreground rounded-full -ml-2"></div>
                </div>
              </Link>
            </div>

            {/* Navigation horizontale centrale - exactement comme référence */}
            <nav className="hidden lg:flex items-center gap-12">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-all duration-200 py-2 relative",
                    isActiveLink(item.href) 
                      ? 'text-foreground font-semibold' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Icônes à droite - exactement comme référence */}
            <div className="flex items-center gap-2">
              
              {/* Filtres - 3 lignes comme sur l'image */}
              <button className="p-3 hover:bg-accent rounded-md transition-colors group">
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-0.5 bg-foreground rounded-full group-hover:bg-foreground/80"></div>
                  <div className="w-4 h-0.5 bg-foreground rounded-full group-hover:bg-foreground/80"></div>
                  <div className="w-4 h-0.5 bg-foreground rounded-full group-hover:bg-foreground/80"></div>
                </div>
              </button>
                
              {/* Grille - 4 carrés comme sur l'image */}
              <button className="p-3 hover:bg-accent rounded-md transition-colors group">
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-sm group-hover:bg-foreground/80"></div>
                  <div className="w-1.5 h-1.5 bg-foreground rounded-sm group-hover:bg-foreground/80"></div>
                  <div className="w-1.5 h-1.5 bg-foreground rounded-sm group-hover:bg-foreground/80"></div>
                  <div className="w-1.5 h-1.5 bg-foreground rounded-sm group-hover:bg-foreground/80"></div>
                </div>
              </button>

              {/* Menu utilisateur - style référence */}
              <div className="ml-4">
                <UserMenu />
              </div>

              {/* Menu mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-3 hover:bg-accent rounded-md transition-colors ml-2"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-border overflow-hidden"
              >
                <nav className="py-4 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block px-4 py-3 text-sm font-medium rounded-md transition-colors",
                        isActiveLink(item.href)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </header>

      {/* Overlay de recherche */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-0 left-0 right-0 bg-background p-6 z-50 border-b border-border shadow-hover"
            >
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="w-full px-6 py-4 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-accent transition-colors"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}