// components/auth/new-password-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import { PasswordStrength } from '@/components/ui/password-strength'
import { cn } from '@/lib/utils'
import { useToast } from "@/hooks/use-toast"

interface NewPasswordFormProps {
  token: string
}

export function NewPasswordForm({ token }: NewPasswordFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (passwordRef.current) {
      passwordRef.current.focus()
    }
  }, [])

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return false
    }
    
    if (password.length < 8 || 
        !password.match(/[A-Z]/) || 
        !password.match(/[a-z]/) || 
        !password.match(/[0-9]/)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre')
      return false
    }

    return true
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validatePasswords()) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage)
      }

      toast({
        title: "Mot de passe modifié",
        description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe",
      })

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue')
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-montserrat text-title">
          Nouveau mot de passe
        </label>
        <div className="relative mt-1">
          <input
            ref={passwordRef}
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-10 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
            )}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-foreground/60" />
            ) : (
              <Eye className="h-5 w-5 text-foreground/60" />
            )}
          </button>
        </div>
        {password && <PasswordStrength password={password} />}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-montserrat text-title">
          Confirmer le mot de passe
        </label>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={cn(
              "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-10 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
            )}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-foreground/60" />
            ) : (
              <Eye className="h-5 w-5 text-foreground/60" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive">
          <p className="text-sm font-roboto text-destructive">{error}</p>
        </div>
      )}

      <LoadingButton type="submit" isLoading={isLoading}>
        Réinitialiser le mot de passe
      </LoadingButton>
    </form>
  )
}