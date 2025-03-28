// app/(auth)/register/page.tsx
import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte - Mushroom Marketplace',
  description: 'Rejoignez notre marketplace de champignons',
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center relative overflow-hidden">
      {/* Ajout du dégradé en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-r from-custom-accentLight to-transparent opacity-30 dark:opacity-20"></div>
      
      <div className="w-full max-w-2xl mx-auto bg-background border border-foreground/10 rounded-lg shadow-lg p-6 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold font-montserrat text-title">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm font-roboto text-foreground/60">
            Rejoignez notre marketplace de champignons
          </p>
        </div>
        
        <RegisterForm />
        
        <div className="text-center text-sm font-roboto mt-6">
          <span className="text-custom-text">Vous avez déjà un compte ?</span>{' '}
          <Link 
            href="/login" 
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  )
}