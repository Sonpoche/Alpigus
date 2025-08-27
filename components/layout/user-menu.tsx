// components/layout/user-menu.tsx
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
import { LogOut, Settings, HelpCircle, UserCircle } from 'lucide-react'
import { useState } from 'react'

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  // Initiales utilisateur
  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="outline-none focus:ring-0">
        {/* Avatar minimaliste - cercle avec initiales */}
        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium hover:bg-foreground/90 transition-colors">
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
        className="w-56 p-2"
        sideOffset={8}
      >
        {/* Info utilisateur */}
        <div className="px-2 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground truncate">
            {session?.user?.name || 'Utilisateur'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session?.user?.email || ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {session?.user?.role || 'CLIENT'}
          </p>
        </div>
        
        {/* Actions */}
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => {
            setIsOpen(false)
            router.push('/profile')
          }}
        >
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Mon Profil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => {
            setIsOpen(false)
            router.push('/dashboard')
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Tableau de bord</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setIsOpen(false)
            router.push('/help')
          }}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Aide</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}