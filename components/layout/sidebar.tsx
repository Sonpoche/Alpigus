// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Store,
  Settings,
  LogOut,
  Calendar as CalendarIcon
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: '/admin',
    label: 'Administration',
    icon: <Users className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    href: '/products',
    label: 'Produits',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    href: '/producer',
    label: 'Espace Producteur',
    icon: <Store className="h-5 w-5" />,
    roles: ['PRODUCER'],
  },
  {
    href: '/producer/delivery-slots/overview',
    label: 'Créneaux de livraison',
    icon: <CalendarIcon className="h-5 w-5" />,
    roles: ['PRODUCER'],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const isActiveLink = (href: string) => pathname === href

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(session?.user?.role as string)
  )

  return (
    <div className="hidden border-r border-foreground/10 bg-background lg:block lg:w-64">
      <div className="flex h-full flex-col justify-between">
        <nav className="space-y-1 px-3 py-4">
          {filteredNavItems.map((item) => {
            const isActive = isActiveLink(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium
                  ${isActive 
                    ? 'bg-custom-accent text-white [&_svg]:text-white [&_span]:text-white'
                    : 'text-custom-text hover:bg-foreground/5'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Menu profil en bas */}
        <div className="border-t border-foreground/10 px-3 py-4">
          <Link
            href="/profile"
            className={`
              flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium mb-2
              ${isActiveLink('/profile')
                ? 'bg-custom-accent text-white [&_svg]:text-white [&_span]:text-white'
                : 'text-custom-text hover:bg-foreground/5'
              }
            `}
          >
            <Settings className="h-5 w-5" />
            <span>Profil</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-custom-text hover:bg-foreground/5"
          >
            <LogOut className="h-5 w-5" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  )
}