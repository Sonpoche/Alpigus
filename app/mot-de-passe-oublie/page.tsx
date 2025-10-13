// Chemin du fichier: app/mot-de-passe-oublie/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Link from 'next/link'
import Image from 'next/image'

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo_alpigus.png"
            alt="Alpigus"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>

        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-gray-600">
            Entrez votre email pour réinitialiser votre mot de passe
          </p>
        </div>
        
        {/* Formulaire dans un container avec bordure */}
        <div className="border-2 border-black rounded-lg p-8 bg-white">
          <ResetPasswordForm />
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