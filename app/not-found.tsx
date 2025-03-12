'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-custom-title">Page non trouvée</h2>
        <p className="mb-6 text-custom-text">La page que vous recherchez n'existe pas.</p>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => router.back()}
            className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Retour
          </button>
          
          <Link 
            href="/"
            className="border border-foreground/10 px-4 py-2 rounded-md hover:bg-foreground/5 transition-colors text-custom-text"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}