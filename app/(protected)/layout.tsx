// Chemin du fichier: app/(protected)/layout.tsx
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { InvoiceProvider } from '@/contexts/invoice-context'
import { OrderProvider } from '@/contexts/order-context'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/connexion')
  }

  return (
    <InvoiceProvider>
      <OrderProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </OrderProvider>
    </InvoiceProvider>
  )
}