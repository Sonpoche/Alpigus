// Chemin du fichier: components/layout/public-header.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLocalCart } from '@/hooks/use-local-cart'
import { useCart } from '@/hooks/use-cart'

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
  const [isAnimating, setIsAnimating] = useState(false)
  
  const localItems = useLocalCart((state) => state.items)
  const localCartItemsCount = localItems.length
  
  const { cartSummary, refreshCart } = useCart()
  const serverCartItemsCount = cartSummary?.itemCount || 0
  
  const cartItemsCount = session ? serverCartItemsCount : localCartItemsCount

  useEffect(() => {
    useLocalCart.persist.rehydrate()
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleCartUpdate = (event?: CustomEvent) => {
      if (session) {
        refreshCart()
        setTimeout(() => refreshCart(), 500)
      }
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }

    const handleCartCreated = (event?: CustomEvent) => {
      if (session) {
        refreshCart()
        setTimeout(() => refreshCart(), 200)
      }
    }

    const handleCartCleared = () => {
      if (session) {
        refreshCart()
        setTimeout(() => refreshCart(), 200)
      }
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }

    window.addEventListener('cart:updated', handleCartUpdate as EventListener)
    window.addEventListener('cart:item-added', handleCartUpdate as EventListener)
    window.addEventListener('cart:item-removed', handleCartUpdate as EventListener)
    window.addEventListener('cart:created', handleCartCreated as EventListener)
    window.addEventListener('cart:cleared', handleCartCleared as EventListener)
    
    return () => {
      window.removeEventListener('cart:updated', handleCartUpdate as EventListener)
      window.removeEventListener('cart:item-added', handleCartUpdate as EventListener)
      window.removeEventListener('cart:item-removed', handleCartUpdate as EventListener)
      window.removeEventListener('cart:created', handleCartCreated as EventListener)
      window.removeEventListener('cart:cleared', handleCartCleared as EventListener)
    }
  }, [session, refreshCart])

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <div className="w-full pt-6">
        <div className="max-w-7xl mx-auto px-8">
          <header className="border-t-2 border-b-2 border-black bg-white">
            <div className="flex h-12 items-center justify-between px-6">
              
              {/* Logo Alpigus */}
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo_alpigus.png"
                  alt="Alpigus"
                  width={60}
                  height={60}
                  className="object-contain"
                />
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
                <Link 
                  href="/panier"
                  className="relative p-2 hover:opacity-60 transition-opacity"
                >
                  <motion.div
                    animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </motion.div>
                  
                  <AnimatePresence>
                    {mounted && cartItemsCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        {cartItemsCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>

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

      {/* Menu mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-3/4 max-w-sm bg-white z-50 lg:hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-black">
                <Image
                  src="/logo_alpigus.png"
                  alt="Alpigus"
                  width={60}
                  height={60}
                  className="object-contain"
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2"
                >
                  <X className="h-6 w-6 text-black" />
                </button>
              </div>

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