// Chemin du fichier: components/layout/user-menu.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, HelpCircle, UserCircle, Home } from 'lucide-react'
import { useState } from 'react'

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'ADMINISTRATEUR'
      case 'PRODUCER':
        return 'PRODUCTEUR'
      case 'CLIENT':
        return 'CLIENT'
      default:
        return role
    }
  }

  // Initiales utilisateur
  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="outline-none focus:ring-0">
        {/* Avatar avec inversion de couleurs au hover */}
        <div className="w-9 h-9 rounded-full bg-white border-2 border-black text-black flex items-center justify-center text-sm font-bold shadow-sm hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'Avatar'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{userInitial}</span>
          )}
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-0 bg-white border-2 border-black rounded-lg shadow-xl overflow-hidden"
        sideOffset={12}
      >
        {/* Info utilisateur - Header avec fond gris */}
        <div className="px-4 py-4 bg-gray-50 border-b-2 border-black">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Connecté en tant que</p>
          <p className="text-sm font-bold text-black truncate">
            {session?.user?.name || 'Utilisateur'}
          </p>
          <p className="text-xs text-gray-600 truncate mt-0.5">
            {session?.user?.email || ''}
          </p>
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-black text-white text-xs font-bold rounded uppercase">
              {getRoleLabel(session?.user?.role || 'CLIENT')}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="py-2">
          <DropdownMenuItem 
            className="mx-2 cursor-pointer hover:bg-gray-100 rounded-md text-black font-medium px-3 py-2.5 focus:bg-gray-100"
            onClick={() => {
              setIsOpen(false)
              router.push('/profil')
            }}
          >
            <UserCircle className="mr-3 h-5 w-5" />
            <span>Mon Profil</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="mx-2 cursor-pointer hover:bg-gray-100 rounded-md text-black font-medium px-3 py-2.5 focus:bg-gray-100"
            onClick={() => {
              setIsOpen(false)
              router.push('/')
            }}
          >
            <Home className="mr-3 h-5 w-5" />
            <span>Accueil du site</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="mx-2 cursor-not-allowed rounded-md text-gray-400 font-medium px-3 py-2.5 relative"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
            }}
          >
            <HelpCircle className="mr-3 h-5 w-5" />
            <span>Aide</span>
            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">
              Bientôt
            </span>
          </DropdownMenuItem>
        </div>
        
        <DropdownMenuSeparator className="bg-gray-200 h-0.5 my-0" />
        
        {/* Déconnexion avec fond rouge au hover */}
        <div className="py-2">
          <DropdownMenuItem 
            className="mx-2 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md font-medium px-3 py-2.5 focus:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Se déconnecter</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}