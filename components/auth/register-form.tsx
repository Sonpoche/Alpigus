// Chemin du fichier: components/auth/register-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { Eye, EyeOff, User, Building, Check } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import type { E164Number } from 'libphonenumber-js/core'
import { LoadingButton } from '@/components/ui/loading-button'
import { PasswordStrength } from '@/components/ui/password-strength'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { signIn } from 'next-auth/react'
import { FcGoogle } from 'react-icons/fc'
import { motion } from 'framer-motion'

type FieldErrors = {
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
  name?: boolean;
  phone?: boolean;
  companyName?: boolean;
}

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const nameRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState<E164Number | undefined>()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.focus()
    }
  }, [])

  const identifyFieldError = (errorMessage: string) => {
    const newFieldErrors: FieldErrors = {}
    
    if (errorMessage.includes('email')) {
      newFieldErrors.email = true
    }
    if (errorMessage.includes('mot de passe')) {
      newFieldErrors.password = true
    }
    if (errorMessage.includes('nom')) {
      newFieldErrors.name = true
    }
    if (errorMessage.includes('téléphone')) {
      newFieldErrors.phone = true
    }
    if (errorMessage.includes('entreprise')) {
      newFieldErrors.companyName = true
    }

    setFieldErrors(newFieldErrors)
  }

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        password: true,
        confirmPassword: true
      }))
      setError('Les mots de passe ne correspondent pas')
      return false
    }
    
    if (password.length < 8 || 
        !password.match(/[A-Z]/) || 
        !password.match(/[a-z]/) || 
        !password.match(/[0-9]/)) {
      setFieldErrors(prev => ({
        ...prev,
        password: true
      }))
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre')
      return false
    }

    return true
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    if (!acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation')
      setIsLoading(false)
      return
    }

    if (!validatePasswords()) {
      setIsLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    const data = {
      email: formData.get('email'),
      password,
      name: formData.get('name'),
      companyName: formData.get('companyName'),
      phone: phoneNumber,
      role: formData.get('role'),
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        identifyFieldError(errorMessage)
        throw new Error(errorMessage)
      }

      const signInResult = await signIn('credentials', {
        email: data.email,
        password: password,
        redirect: false,
      })

      if (signInResult?.error) {
        throw new Error("Erreur lors de la connexion automatique")
      }

      toast({
        title: "Compte créé avec succès",
        description: "Vous allez être redirigé vers votre tableau de bord"
      })

      router.push('/tableau-de-bord')

    } catch (error: any) {
      console.error('Error details:', error)
      setError(error.message || 'Une erreur est survenue lors de l\'inscription')
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'inscription",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom complet */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
            Nom complet
          </label>
          <input
            ref={nameRef}
            id="name"
            name="name"
            type="text"
            className={cn(
              "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
              fieldErrors.name && "border-red-500"
            )}
            placeholder="Jean Dupont"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={cn(
              "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
              fieldErrors.email && "border-red-500"
            )}
            placeholder="votre@email.com"
            required
          />
        </div>

        {/* Téléphone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
            Téléphone
          </label>
          <PhoneInput
            international
            defaultCountry="CH"
            value={phoneNumber}
            onChange={setPhoneNumber}
            className={cn(
              "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
              fieldErrors.phone && "border-red-500"
            )}
            required
          />
        </div>

        {/* Mot de passe et Confirmation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
                  fieldErrors.password && "border-red-500"
                )}
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
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
                  fieldErrors.confirmPassword && "border-red-500"
                )}
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
        </div>

        {/* Indicateur de force du mot de passe */}
        {password && <PasswordStrength password={password} />}

        {/* Type de compte */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-black">
            Type de compte
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectedRole === 'CLIENT' ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
            )}>
              <input
                id="client"
                name="role"
                type="radio"
                value={UserRole.CLIENT}
                required
                onChange={(e) => setSelectedRole(e.target.value)}
                className="sr-only"
              />
              <User className="h-6 w-6 mb-2 text-black" />
              <span className="font-medium text-black">Client</span>
              <span className="text-xs text-gray-600 mt-1">Je souhaite acheter</span>
              {selectedRole === 'CLIENT' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}
            </label>
            <label className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectedRole === 'PRODUCER' ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
            )}>
              <input
                id="producer"
                name="role"
                type="radio"
                value={UserRole.PRODUCER}
                required
                onChange={(e) => setSelectedRole(e.target.value)}
                className="sr-only"
              />
              <Building className="h-6 w-6 mb-2 text-black" />
              <span className="font-medium text-black">Producteur</span>
              <span className="text-xs text-gray-600 mt-1">Je souhaite vendre</span>
              {selectedRole === 'PRODUCER' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Champ conditionnel pour les producteurs */}
        {selectedRole === UserRole.PRODUCER && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label htmlFor="companyName" className="block text-sm font-medium text-black mb-2">
              Nom de l'entreprise
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className={cn(
                "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
                fieldErrors.companyName && "border-red-500"
              )}
              placeholder="Nom de votre entreprise"
              required
            />
          </motion.div>
        )}

        {/* Conditions d'utilisation */}
        <div className="flex items-start">
          <div className="flex items-center h-5 mt-0.5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black focus:ring-offset-0"
              required
            />
          </div>
          <div className="ml-3">
            <label htmlFor="terms" className="text-sm text-gray-600">
              J'accepte les{' '}
              <Link
                href="/conditions"
                target="_blank"
                className="font-medium text-black hover:opacity-60 transition-opacity"
              >
                conditions d'utilisation
              </Link>{' '}
              et la{' '}
              <Link
                href="/confidentialite"
                target="_blank"
                className="font-medium text-black hover:opacity-60 transition-opacity"
              >
                politique de confidentialité
              </Link>
            </label>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-50 border border-red-200"
          >
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}

        {/* Bouton de soumission */}
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          disabled={!selectedRole || !acceptTerms}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          S'inscrire
        </LoadingButton>

        {/* Séparateur avec texte */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 text-sm text-gray-500 bg-white">
              Ou s'inscrire avec
            </span>
          </div>
        </div>

        {/* Bouton Google */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/tableau-de-bord' })}
          className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-gray-50 transition-colors"
        >
          <FcGoogle className="h-5 w-5" />
          <span>Google</span>
        </button>
      </form>
    </motion.div>
  )
} 