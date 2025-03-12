'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signOut } from "next-auth/react"
import { CompleteProfileBanner } from '@/components/profile/complete-profile-banner'

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      router.push('/admin')
    }
  }, [session, router])

  if (!session) {
    return <div className="text-custom-text">Chargement...</div>
  }

  const isProfileIncomplete = !session.user.role || !session.user.phone

  return (
    <div className="p-8">
      {isProfileIncomplete && <CompleteProfileBanner />}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-montserrat font-bold text-custom-title mb-2">
          Bonjour, {session?.user?.name}
        </h1>
        <h2 className="text-md font-montserrat font-semibold text-custom-title mb-6">
          {isProfileIncomplete 
            ? "Veuillez compléter votre profil pour accéder à toutes les fonctionnalités"
            : "Bienvenue sur votre tableau de bord"
          }
        </h2>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-montserrat text-custom-text/60">Nom</h2>
            <p className="text-custom-text">{session?.user?.name || '-'}</p>
          </div>
          
          <div>
            <h2 className="text-sm font-montserrat text-custom-text/60">Type de compte</h2>
            <p className="text-custom-text">{session?.user?.role || '-'}</p>
          </div>

          {session?.user?.role && (
            <div>
              <h2 className="text-sm font-montserrat text-custom-text/60">Téléphone</h2>
              <p className="text-custom-text">{session?.user?.phone || '-'}</p>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-4 bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}