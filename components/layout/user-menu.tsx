// components/layout/user-menu.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings, HelpCircle, Moon, Sun, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { motion } from 'framer-motion'

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  // Déterminer initiales et couleur
  const userInitial = session?.user?.name?.charAt(0) || 'U'
  
  // Générer une couleur de fond basée sur l'email (pour la consistance)
  const getColorFromEmail = (email?: string | null) => {
    if (!email) return 'bg-custom-accent'
    
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const colors = [
      'bg-blue-500', 'bg-teal-500', 'bg-green-500', 'bg-amber-500',
      'bg-orange-500', 'bg-custom-accent', 'bg-violet-500', 'bg-pink-500'
    ]
    
    return colors[Math.abs(hash) % colors.length]
  }
  
  const avatarColor = getColorFromEmail(session?.user?.email)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="flex items-center space-x-2 outline-none focus:ring-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${avatarColor} transition-transform duration-200 ${isOpen ? 'scale-110' : ''}`}>
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'Avatar'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium">{userInitial}</span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-2 mr-2"
        sideOffset={10}
      >
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium truncate">
            {session?.user?.name || 'Utilisateur'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session?.user?.email || ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.role || 'CLIENT'}
          </p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="py-2 px-2 cursor-pointer"
          onClick={() => router.push('/profile')}
        >
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Mon Profil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="py-2 px-2 cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Tableau de bord</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="py-2 px-2 cursor-pointer flex justify-between"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <div className="flex items-center">
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Thème {theme === 'dark' ? 'clair' : 'sombre'}</span>
          </div>
          <motion.div 
            animate={{ rotate: theme === 'dark' ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-400" />
            )}
          </motion.div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          className="py-2 px-2 cursor-pointer"
          onClick={() => router.push('/help')}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Aide</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="py-2 px-2 cursor-pointer text-destructive hover:text-white hover:bg-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}