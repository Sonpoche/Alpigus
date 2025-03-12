'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function CompleteProfileBanner() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user) return null

  const isProfileIncomplete = !session.user.role || !session.user.phone
  
  if (!isProfileIncomplete) return null

  const handleClick = () => {
    router.push('/profile/complete')
  }

  return (
    <div className="bg-custom-accent/10 border-l-4 border-custom-accent p-4 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-custom-accent" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">Attention :</span> Votre profil est incomplet. 
              <button 
                onClick={handleClick}
                className="font-medium underline text-custom-accent hover:opacity-90 ml-1"
              >
                Cliquez ici pour le compléter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}