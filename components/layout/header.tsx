// components/layout/header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Store, Menu, X, Home, ShoppingBag, Package, Calendar, Search, Wallet } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'
import { CartButton } from '../cart/cart-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from 'framer-motion'
import { NotificationBell } from './notification-bell'

// Menus de navigation par rôle
const clientNavItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: Home },
  { href: '/products', label: 'Catalogue', icon: ShoppingBag }, 
  { href: '/orders', label: 'Mes Commandes', icon: Package },
]

const producerNavItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: Home },
  { href: '/producer', label: 'Mes Produits', icon: Package },
  { href: '/producer/delivery-slots/overview', label: 'Livraisons', icon: Calendar },
  { href: '/producer/orders', label: 'Commandes', icon: ShoppingBag },
  // Retiré le portefeuille d'ici pour le mettre dans les icônes
]

const adminNavItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: Home },
  { href: '/admin', label: 'Administration', icon: Package },
  { href: '/admin/users', label: 'Utilisateurs', icon: Package },
  { href: '/admin/products', label: 'Produits', icon: ShoppingBag },
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
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);
  
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearchOpen(false)
      // Rediriger vers la page de recherche
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <>
      <header className={`sticky top-0 z-50 w-full border-b ${scrolled ? 'bg-background/80 backdrop-blur-md border-foreground/10' : 'bg-background border-foreground/10'} transition-all duration-200`}>
        <div className="w-full px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo et navigation principale */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-custom-title font-montserrat">
                  🍄 MushRoom
                </span>
              </Link>

              {/* Navigation Desktop SEULEMENT (à partir de xl:) */}
              <nav className="hidden xl:flex items-center gap-6">
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

            {/* Actions Desktop SEULEMENT */}
            <div className="hidden xl:flex items-center gap-4">
              {/* Bouton de recherche */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                aria-label="Rechercher"
              >
                <Search className="h-5 w-5" />
              </button>
            
              {session?.user?.role === 'PRODUCER' && (
                <>
                  <Link 
                    href="/producer" 
                    className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                    aria-label="Mon magasin"
                  >
                    <Store className="h-5 w-5" />
                  </Link>
                  <Link 
                    href="/producer/wallet" 
                    className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                    aria-label="Portefeuille"
                  >
                    <Wallet className="h-5 w-5" />
                  </Link>
                </>
              )}
              
              {isClient && (
                <CartButton />
              )}
              
              {/* Notifications pour tous les utilisateurs */}
              {session?.user && (
                <NotificationBell />
              )}

              <ThemeToggle />
              <UserMenu />
            </div>

            {/* Menu Mobile/Tablette (md et moins) */}
            <div className="flex xl:hidden items-center gap-3">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                aria-label="Rechercher"
              >
                <Search className="h-5 w-5" />
              </button>
              
              {/* Icônes producteur sur mobile/tablette */}
              {session?.user?.role === 'PRODUCER' && (
                <>
                  <Link 
                    href="/producer" 
                    className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                    aria-label="Mon magasin"
                  >
                    <Store className="h-5 w-5" />
                  </Link>
                  <Link 
                    href="/producer/wallet" 
                    className="p-2 rounded-md hover:bg-foreground/5 text-custom-text hover:text-custom-accent transition-colors"
                    aria-label="Portefeuille"
                  >
                    <Wallet className="h-5 w-5" />
                  </Link>
                </>
              )}
              
              {isClient && (
                <CartButton />
              )}

              {/* Notification pour mobile/tablette */}
              {session?.user && (
                <NotificationBell />
              )}
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-custom-text hover:text-custom-accent p-1"
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

          {/* Navigation Mobile/Tablette */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="xl:hidden border-t border-foreground/10 overflow-hidden"
              >
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
                  
                  {/* PLUS d'actions spéciales dans le menu - tout est dans les icônes maintenant */}
                </nav>
                
                <div className="border-t border-foreground/10 pb-3 pt-4">
                  <div className="flex items-center justify-between px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-custom-accent rounded-full flex items-center justify-center text-white">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session?.user?.name || 'Utilisateur'}</p>
                        <p className="text-xs text-muted-foreground">{session?.user?.email || ''}</p>
                      </div>
                    </div>
                    <div>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-0 left-0 right-0 bg-background p-4 z-50 border-b border-foreground/10 shadow-lg"
            >
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative">
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="w-full pl-10 pr-12 py-3 rounded-full border border-foreground/10 bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-custom-accent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/60" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-foreground/10"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}