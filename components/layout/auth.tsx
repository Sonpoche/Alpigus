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
      <div className="min-h-screen flex items-center justify-center w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
        <Header />
        <div className="flex flex-1 w-full min-w-0">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
            <main className="flex-1 overflow-y-auto w-full">
              <div className="w-full max-w-full min-w-0">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />
      <main className="flex-1 w-full min-w-0">
        <div className="w-full max-w-full min-w-0">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}