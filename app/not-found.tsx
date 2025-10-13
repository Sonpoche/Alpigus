// Chemin du fichier: app/not-found.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo_alpigus_entier.png"
            alt="Alpigus"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>

        {/* 404 stylisé */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-black mb-2">404</h1>
          <div className="h-1 w-20 bg-black mx-auto"></div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold mb-3 text-black">Page non trouvée</h2>
        <p className="text-gray-600 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        
        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-black text-black rounded-lg hover:bg-black hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>

        {/* Liens utiles */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Liens utiles :</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/produits" className="text-black hover:opacity-60 transition-opacity">
              Catalogue
            </Link>
            <Link href="/producteurs" className="text-black hover:opacity-60 transition-opacity">
              Producteurs
            </Link>
            <Link href="/a-propos" className="text-black hover:opacity-60 transition-opacity">
              À propos
            </Link>
            <Link href="/contact" className="text-black hover:opacity-60 transition-opacity">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}