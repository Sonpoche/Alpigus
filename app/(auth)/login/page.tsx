// app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion - Mushroom Marketplace',
  description: 'Connectez-vous à votre compte Mushroom Marketplace',
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-6 bg-background border border-foreground/10 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold font-montserrat text-title">
            Connexion
          </h2>
          <p className="mt-2 text-center text-sm font-roboto text-foreground/60">
            Accédez à votre compte Mushroom Marketplace
          </p>
        </div>
        <LoginForm />
        <div className="text-center text-sm font-roboto">
          <span className="text-custom-text">Pas encore de compte ?</span>{' '}
          <Link 
            href="/register" 
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  )
}