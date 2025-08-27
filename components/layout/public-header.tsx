// components/layout/public-header.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const publicNavItems = [
  { href: '/about', label: 'À propos' },
  { href: '/products', label: 'Catalogue' },
  { href: '/producers', label: 'Producteurs' },
  { href: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isActiveLink = (href: string) => pathname === href

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo minimaliste */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              {/* Logo minimaliste - 2 cercles */}
              <div className="flex items-center gap-1 mr-3">
                <div className="w-6 h-6 bg-foreground rounded-full"></div>
                <div className="w-4 h-4 bg-background border-2 border-foreground rounded-full -ml-2"></div>
              </div>
              <span className="text-lg font-montserrat font-semibold text-foreground hidden sm:block">
                Mushroom Marketplace
              </span>
            </Link>
          </div>

          {/* Navigation horizontale centrale */}
          <nav className="hidden md:flex items-center gap-8">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-all duration-200 py-2 px-1 relative",
                  isActiveLink(item.href) 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                {/* Indicateur actif minimaliste */}
                {isActiveLink(item.href) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-foreground rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                >
                  Accéder
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200"
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