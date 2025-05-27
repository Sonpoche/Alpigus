// components/layout/sidebar.tsx - Mise à jour de la détection mobile/tablette
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { ChevronLeft, Menu, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import ClientMenu from './client-menu'
import ProducerMenu from './producer-menu'
import AdminMenu from './admin-menu'

export function Sidebar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false)
  const pathname = usePathname()

  // Détecter mobile ET tablette (fermé par défaut jusqu'à 1024px)
  useEffect(() => {
    const handleResize = () => {
      const mobileOrTablet = window.innerWidth < 1024 // Changé de 768 à 1024
      setIsMobileOrTablet(mobileOrTablet)
      // Sur mobile/tablette, fermer par défaut
      if (mobileOrTablet) {
        setIsOpen(false)
      } else {
        setIsOpen(true)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fermer la sidebar sur mobile/tablette quand on change de page
  useEffect(() => {
    if (isMobileOrTablet) {
      setIsOpen(false)
    }
  }, [pathname, isMobileOrTablet])

  if (!session?.user) return null
  
  return (
    <>
      {/* Overlay pour mobile/tablette */}
      {isMobileOrTablet && isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Bouton de toggle pour mobile/tablette */}
      {isMobileOrTablet && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-20 p-3 bg-custom-accent text-white rounded-full shadow-lg hover:bg-custom-accent/90 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      {/* Bouton de toggle pour desktop lorsque la sidebar est fermée */}
      {!isMobileOrTablet && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-20 left-0 z-40 p-2 bg-custom-accent hover:bg-custom-accent/90 text-white rounded-r-md shadow-md transition-colors"
          aria-label="Ouvrir la sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      
      {/* Sidebar container */}
      <div 
        className={cn(
          "bg-background border-r border-foreground/10 h-full flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          isMobileOrTablet ? "fixed top-0 left-0 bottom-0 z-30" : "relative",
          isOpen ? "w-64" : "w-0"
        )}
      >
        {/* Contenu de la sidebar - visible uniquement quand isOpen est true */}
        {isOpen && (
          <div className="w-64 h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between flex-shrink-0">
              <Link href="/dashboard" className="font-montserrat font-bold text-custom-title truncate">
                Mushroom Market
              </Link>
              {!isMobileOrTablet && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60 flex-shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pt-2">
              <div className="py-2">
                {session.user.role === UserRole.CLIENT && <ClientMenu />}
                {session.user.role === UserRole.PRODUCER && <ProducerMenu />}
                {session.user.role === UserRole.ADMIN && <AdminMenu />}
              </div>
            </div>
            
            <div className="p-4 border-t border-foreground/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-custom-accentLight text-custom-accent flex items-center justify-center font-medium flex-shrink-0">
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{session.user.name || 'Utilisateur'}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}