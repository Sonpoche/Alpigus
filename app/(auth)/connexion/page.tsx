// Chemin du fichier: app/(auth)/connexion/page.tsx
import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre compte',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Connexion
          </h1>
          <p className="text-gray-600">
            Accédez à votre compte
          </p>
        </div>
        
        {/* Formulaire dans un container avec bordure */}
        <div className="border-2 border-black rounded-lg p-8 bg-white">
          <LoginForm />
        </div>
        
        {/* Lien création de compte */}
        <div className="text-center mt-6">
          <span className="text-gray-600">Pas encore de compte ?</span>{' '}
          <Link 
            href="/inscription" 
            className="text-black font-medium hover:opacity-60 transition-opacity"
          >
            Créer un compte
          </Link>
        </div>

        {/* Lien retour accueil */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-black transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  )
}