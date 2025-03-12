// components/layout/public-header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

const publicNavItems = [
  { href: '/about', label: 'À propos' },
  { href: '/products', label: 'Produits' },
  { href: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const { data: session } = useSession()

  return (
    <header className="w-full border-b border-foreground/10 bg-background">
      <div className="w-full px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-custom-title font-montserrat">
                🍄 MushRoom
              </span>
            </Link>

            {/* Navigation principale */}
            <nav className="hidden md:flex items-center gap-6">
              {publicNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-custom-text hover:text-custom-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden md:block text-sm font-medium text-custom-text hover:text-custom-accent transition-colors"
                >
                  Dashboard
                </Link>
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-custom-text hover:text-custom-accent transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="hidden md:inline-flex items-center justify-center rounded-md bg-custom-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}