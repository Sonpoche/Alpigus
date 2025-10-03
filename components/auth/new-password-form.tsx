// Chemin du fichier: components/auth/new-password-form.tsx
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
        router.push('/connexion')
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-black transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {password && <PasswordStrength password={password} />}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-black transition-colors"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <LoadingButton 
        type="submit" 
        isLoading={isLoading}
        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
      >
        Réinitialiser le mot de passe
      </LoadingButton>
    </form>
  )
}