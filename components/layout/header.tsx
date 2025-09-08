// Chemin du fichier: components/layout/header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { UserMenu } from './user-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const clientNavItems = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/produits', label: 'Mes produits' }, 
  { href: '/commandes', label: 'Commandes' },
  { href: '/factures', label: 'Factures' },
]

const producerNavItems = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/producteur', label: 'Mes produits' },
  { href: '/producteur/commandes', label: 'Commandes' },
  { href: '/producteur/creneaux-livraison/apercu', label: 'Livraisons' },
  { href: '/producteur/statistiques', label: 'Archive' },
  { href: '/producteur/portefeuille', label: 'Blog' },
]

const adminNavItems = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/admin', label: 'Administration' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs' },
  { href: '/admin/produits', label: 'Produits' },
  { href: '/admin/statistiques', label: 'Statistiques' },
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
  
  const isActiveLink = (href: string) => {
    if (href === '/tableau-de-bord') return pathname === '/tableau-de-bord'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Container avec espacement du haut plus important */}
      <div className="w-full pt-6">
        {/* Navigation avec bordures - largeur 1280px centrée */}
        <div className="max-w-7xl mx-auto px-8">
          <header className="border-t-2 border-b-2 border-black bg-white">
            <div className="flex h-12 items-center justify-between px-6">
              
              {/* Logo minimaliste - plus petit */}
              <Link href="/tableau-de-bord" className="flex items-center">
                <div className="flex items-center">
                  <div className="w-[28px] h-[28px] bg-black rounded-full z-10"></div>
                  <div className="w-[28px] h-[28px] bg-white border-[1.5px] border-black rounded-full -ml-2.5"></div>
                </div>
              </Link>

              {/* Navigation centrale - desktop */}
              <nav className="hidden lg:flex items-center">
                <ul className="flex items-center gap-8">
                  {navItems.map((item) => (
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

              {/* Section Compte */}
              <div className="flex items-center gap-3">
                {/* Lien Compte - desktop */}
                <div className="hidden lg:block">
                  {session ? (
                    <UserMenu />
                  ) : (
                    <Link 
                      href="/connexion" 
                      className="text-sm text-black font-light hover:opacity-60 transition-opacity duration-200"
                    >
                      Compte
                    </Link>
                  )}
                </div>

                {/* Menu burger - mobile - plus petit */}
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
                  {navItems.map((item) => (
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
                </ul>

                {/* Compte - mobile */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  {session ? (
                    <div className="text-black">
                      <p className="text-sm text-gray-600 mb-2">Connecté en tant que</p>
                      <p className="font-medium">{session.user?.email}</p>
                      <Link
                        href="/compte"
                        className="block mt-4 text-black hover:opacity-60 transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Mon compte
                      </Link>
                    </div>
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