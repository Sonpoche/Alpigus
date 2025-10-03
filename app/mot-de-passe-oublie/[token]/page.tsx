// Chemin du fichier: app/mot-de-passe-oublie/[token]/page.tsx
import { NewPasswordForm } from '@/components/auth/new-password-form'
import Link from 'next/link'

export default function NewPasswordPage({
  params,
}: {
  params: { token: string }
}) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-gray-600">
            Veuillez choisir un nouveau mot de passe
          </p>
        </div>
        
        {/* Formulaire dans un container avec bordure */}
        <div className="border-2 border-black rounded-lg p-8 bg-white">
          <NewPasswordForm token={params.token} />
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