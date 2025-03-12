// components/auth/reset-password-form.tsx
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
      <div className="text-center">
        <div className="mb-4 text-sm font-roboto text-custom-text">
          Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation dans quelques minutes.
        </div>
        <div className="mb-4 text-sm font-roboto text-custom-text">
          Pensez à vérifier vos spams.
        </div>
        <Link 
          href="/login"
          className="text-sm font-medium text-custom-accent hover:opacity-90 transition-opacity"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-montserrat text-title">
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
          className={cn(
            "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors"
          )}
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive">
          <p className="text-sm font-roboto text-destructive">{error}</p>
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <LoadingButton type="submit" isLoading={isLoading}>
          Envoyer le lien
        </LoadingButton>
        
        <Link 
          href="/login"
          className="text-center text-sm font-medium text-custom-text hover:text-custom-accent transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    </form>
  )
}