// components/layout/sidebar.tsx
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
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  // Détecter le mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsOpen(window.innerWidth >= 768)
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fermer la sidebar sur mobile quand on change de page
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  if (!session?.user) return null
  
  return (
    <>
      {/* Overlay pour mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Bouton de toggle pour mobile */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-20 p-3 bg-custom-accent text-white rounded-full shadow-lg"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      {/* Bouton de toggle pour desktop lorsque la sidebar est fermée */}
      {!isMobile && !isOpen && (
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
          "bg-background border-r border-foreground/10 h-full flex flex-col transition-all duration-300 ease-in-out",
          isMobile ? "fixed top-0 left-0 bottom-0 z-30" : "relative",
          isOpen ? "w-64" : "w-0"
        )}
      >
        {/* Contenu de la sidebar - visible uniquement quand isOpen est true */}
        {isOpen && (
          <>
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
              <Link href="/dashboard" className="font-montserrat font-bold text-custom-title">
                Mushroom Market
              </Link>
              {!isMobile && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60"
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
            
            <div className="p-4 border-t border-foreground/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-custom-accentLight text-custom-accent flex items-center justify-center font-medium">
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{session.user.name || 'Utilisateur'}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}