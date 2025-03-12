// app/(auth)/layout.tsx
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      {children}
      <Footer />
    </div>
  )
}