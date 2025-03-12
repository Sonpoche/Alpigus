'use client'

// components/layout/auth.tsx
import { useSession } from 'next-auth/react'
import { PublicHeader } from './public-header'
import { Header } from './header'
import { Footer } from './footer'
import { Sidebar } from './sidebar'

interface AuthProps {
  children: React.ReactNode
}

export function Auth({ children }: AuthProps) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  )
}