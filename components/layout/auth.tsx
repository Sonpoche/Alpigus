// components/layout/auth.tsx
'use client'

import { useSession } from 'next-auth/react'
import { PublicHeader } from './public-header'
import { Header } from './header'
import { Footer } from './footer'

interface AuthProps {
  children: React.ReactNode
}

export function Auth({ children }: AuthProps) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center w-full">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <Header />
        <main className="flex-1 w-full">
          <div className="w-full">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PublicHeader />
      <main className="flex-1 w-full">
        <div className="w-full">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}