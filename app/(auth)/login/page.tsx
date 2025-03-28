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
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center relative overflow-hidden">
      {/* Fond avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-r from-custom-accentLight to-transparent opacity-30 dark:opacity-20"></div>
      
      <div className="w-full max-w-md mx-auto bg-background border border-foreground/10 rounded-lg shadow-lg p-6 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold font-montserrat text-title">
            Connexion
          </h2>
          <p className="mt-2 text-sm font-roboto text-foreground/60">
            Accédez à votre compte Mushroom Marketplace
          </p>
        </div>
        
        <LoginForm />
        
        <div className="text-center text-sm font-roboto mt-6">
          <span className="text-custom-text">Pas encore de compte ?</span>{' '}
          <Link 
            href="/register" 
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  )
}