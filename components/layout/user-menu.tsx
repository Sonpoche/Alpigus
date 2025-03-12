// components/layout/user-menu.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export function UserMenu() {
  const { data: session } = useSession()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 hover:opacity-80">
        <User className="h-5 w-5 text-custom-text" />
        <span className="text-sm font-medium text-custom-text">
          {session?.user?.name || 'Mon compte'}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <Link href="/profile" className="w-full">
          <DropdownMenuItem className="cursor-pointer hover:bg-custom-accent hover:text-white focus:bg-custom-accent focus:text-white [&>*]:hover:text-white">
            <Settings className="mr-2 h-4 w-4" />
            <span>Profil</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="cursor-pointer hover:bg-custom-accent hover:text-white focus:bg-custom-accent focus:text-white [&>*]:hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}