// components/layout/profile-completion-alert.tsx
'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export function ProfileCompletionAlert() {
  const { data: session } = useSession()

  if (!session?.user || (session.user.role && session.user.phone)) return null

  return (
    <div className="bg-custom-accent text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <p className="text-sm font-medium">
          Votre profil est incomplet. Pour accéder à toutes les fonctionnalités, veuillez compléter votre profil.
        </p>
        <Link
          href="/profile/complete"
          className="ml-4 whitespace-nowrap bg-white text-custom-accent px-4 py-1.5 rounded-md text-sm font-medium hover:bg-opacity-90 transition-opacity"
        >
          Compléter mon profil
        </Link>
      </div>
    </div>
  )
}