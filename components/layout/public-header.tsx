// Chemin du fichier: components/layout/public-header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLocalCart } from '@/hooks/use-local-cart'

const publicNavItems = [
  { href: '/', label: 'Accueil' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/produits', label: 'Catalogue' },
  { href: '/producteurs', label: 'Producteurs' },
  { href: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Récupérer le nombre d'items du panier
  const getTotalItems = useLocalCart((state) => state.getTotalItems)
  const cartItemsCount = getTotalItems()

  // Hydrater après le montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
    setMounted(true)
  }, [])

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Container avec espacement du haut */}
      <div className="w-full pt-6">
        {/* Navigation avec bordures */}
        <div className="max-w-7xl mx-auto px-8">
          <header className="border-t-2 border-b-2 border-black bg-white">
            <div className="flex h-12 items-center justify-between px-6">
              
              {/* Logo minimaliste */}
              <Link href="/" className="flex items-center">
                <div className="flex items-center">
                  <div className="w-[28px] h-[28px] bg-black rounded-full z-10"></div>
                  <div className="w-[28px] h-[28px] bg-white border-[1.5px] border-black rounded-full -ml-2.5"></div>
                </div>
              </Link>

              {/* Navigation centrale - desktop */}
              <nav className="hidden lg:flex items-center">
                <ul className="flex items-center gap-8">
                  {publicNavItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "text-sm transition-opacity duration-200 relative",
                          isActiveLink(item.href) 
                            ? 'text-black font-medium' 
                            : 'text-black font-light hover:opacity-60'
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Actions à droite */}
              <div className="flex items-center gap-4">
                {/* Panier */}
                <Link 
                  href="/panier"
                  className="relative p-2 hover:opacity-60 transition-opacity"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {mounted && cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>

                {/* Lien Compte ou Login - desktop */}
                <div className="hidden lg:block">
                  {session ? (
                    <Link 
                      href="/tableau-de-bord" 
                      className="text-sm text-black font-light hover:opacity-60 transition-opacity duration-200"
                    >
                      Tableau de bord
                    </Link>
                  ) : (
                    <Link 
                      href="/connexion" 
                      className="text-sm text-black font-light hover:opacity-60 transition-opacity duration-200"
                    >
                      Se connecter
                    </Link>
                  )}
                </div>

                {/* Menu burger - mobile */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-1.5"
                  aria-label="Menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-black" />
                  ) : (
                    <Menu className="h-5 w-5 text-black" />
                  )}
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Menu mobile - Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Fond sombre */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Panel de navigation */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-3/4 max-w-sm bg-white z-50 lg:hidden"
            >
              {/* Header du menu mobile */}
              <div className="flex items-center justify-between p-6 border-b border-black">
                <div className="flex items-center">
                  <div className="w-[30px] h-[30px] bg-black rounded-full z-10"></div>
                  <div className="w-[30px] h-[30px] bg-white border-2 border-black rounded-full -ml-2.5"></div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2"
                >
                  <X className="h-6 w-6 text-black" />
                </button>
              </div>

              {/* Navigation mobile */}
              <nav className="p-6">
                <ul className="space-y-6">
                  {publicNavItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "block text-lg transition-opacity duration-200",
                          isActiveLink(item.href)
                            ? 'text-black font-semibold'
                            : 'text-black font-normal hover:opacity-60'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  
                  {/* Panier dans le menu mobile */}
                  <li>
                    <Link
                      href="/panier"
                      className="flex items-center gap-2 text-lg text-black hover:opacity-60 transition-opacity"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Panier
                      {mounted && cartItemsCount > 0 && (
                        <span className="bg-black text-white text-xs rounded-full px-2 py-0.5">
                          {cartItemsCount}
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>

                {/* Login/Dashboard - mobile */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  {session ? (
                    <Link
                      href="/tableau-de-bord"
                      className="block text-lg text-black font-normal hover:opacity-60 transition-opacity"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Accéder au tableau de bord
                    </Link>
                  ) : (
                    <Link
                      href="/connexion"
                      className="block text-lg text-black font-normal hover:opacity-60 transition-opacity"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Se connecter
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}