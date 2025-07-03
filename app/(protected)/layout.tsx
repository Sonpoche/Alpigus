// app/(protected)/layout.tsx - Version mise à jour avec OrderProvider
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Footer } from '@/components/layout/footer'
import { InvoiceProvider } from '@/contexts/invoice-context'
import { OrderProvider } from '@/contexts/order-context'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Si pas de session, rediriger vers login
  if (!session) {
    redirect('/login')
  }

  return (
    <InvoiceProvider>
      <OrderProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <main className="flex-1 overflow-y-auto">
                <div className="p-8 font-roboto text-custom-text">
                  {children}
                </div>
              </main>
              <Footer />
            </div>
          </div>
        </div>
      </OrderProvider>
    </InvoiceProvider>
  )
}