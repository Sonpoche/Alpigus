// Chemin du fichier: app/(auth)/inscription/page.tsx
import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Rejoignez notre marketplace',
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Créer un compte
          </h1>
          <p className="text-gray-600">
            Rejoignez notre marketplace
          </p>
        </div>
        
        {/* Formulaire dans un container avec bordure */}
        <div className="border-2 border-black rounded-lg p-8 bg-white">
          <RegisterForm />
        </div>
        
        {/* Lien connexion */}
        <div className="text-center mt-6">
          <span className="text-gray-600">Vous avez déjà un compte ?</span>{' '}
          <Link 
            href="/connexion" 
            className="text-black font-medium hover:opacity-60 transition-opacity"
          >
            Se connecter
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