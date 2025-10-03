
// Chemin du fichier: components/auth/reset-password-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

export function ResetPasswordForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus()
    }
  }, [])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage)
      }

      setSuccess(true)
      toast({
        title: "Demande envoyée",
        description: "Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation",
      })
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue')
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation dans quelques minutes.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Pensez à vérifier vos spams.
        </p>
        <Link 
          href="/connexion"
          className="inline-block text-sm font-medium text-black hover:opacity-60 transition-opacity"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
          Email
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black"
          placeholder="votre@email.com"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          Envoyer le lien
        </LoadingButton>
        
        <Link 
          href="/connexion"
          className="block text-center text-sm text-gray-600 hover:text-black transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    </form>
  )
}