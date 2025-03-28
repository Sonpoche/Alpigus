// components/auth/register-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { Eye, EyeOff, User, Mail, Phone, Shield, Building, Check } from 'lucide-react'
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

      // Connexion automatique après inscription réussie
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

      router.push('/dashboard')

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
            <label htmlFor="name" className="form-label flex items-center gap-2">
              <User className="h-4 w-4 text-custom-accent" />
              Nom complet
            </label>
            <input
              ref={nameRef}
              id="name"
              name="name"
              type="text"
              className={cn(
                "form-input",
                fieldErrors.name && "border-destructive"
              )}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="form-label flex items-center gap-2">
              <Mail className="h-4 w-4 text-custom-accent" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={cn(
                "form-input",
                fieldErrors.email && "border-destructive"
              )}
              required
            />
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="phone" className="form-label flex items-center gap-2">
              <Phone className="h-4 w-4 text-custom-accent" />
              Téléphone
            </label>
            <PhoneInput
              international
              defaultCountry="CH"
              value={phoneNumber}
              onChange={setPhoneNumber}
              className={cn(
                "form-input flex",
                fieldErrors.phone && "border-destructive"
              )}
              required
            />
          </div>

          {/* Mot de passe et Confirmation côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="form-label flex items-center gap-2">
                <Shield className="h-4 w-4 text-custom-accent" />
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
                    "form-input pr-10",
                    fieldErrors.password && "border-destructive"
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label flex items-center gap-2">
                <Shield className="h-4 w-4 text-custom-accent" />
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
                    "form-input pr-10",
                    fieldErrors.confirmPassword && "border-destructive"
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label flex items-center gap-2">
              <Shield className="h-4 w-4 text-custom-accent" />
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
                  "form-input pr-10",
                  fieldErrors.confirmPassword && "border-destructive"
                )}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        

        {/* Indicateur de force du mot de passe */}
        {password && <PasswordStrength password={password} />}

        {/* Type de compte - reste normal */}
        <div className="space-y-2">
          <label className="form-label flex items-center gap-2">
            <Building className="h-4 w-4 text-custom-accent" />
            Type de compte
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-lg border border-input cursor-pointer transition-colors",
              selectedRole === 'CLIENT' ? "bg-custom-accentLight border-custom-accent" : "hover:bg-muted/30"
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
              <User className="h-6 w-6 mb-2" />
              <span className="font-medium">Client</span>
              <span className="text-xs text-muted-foreground mt-1">Je souhaite acheter</span>
              {selectedRole === 'CLIENT' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-custom-accent" />
                </div>
              )}
            </label>
            <label className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-lg border border-input cursor-pointer transition-colors",
              selectedRole === 'PRODUCER' ? "bg-custom-accentLight border-custom-accent" : "hover:bg-muted/30"
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
              <Building className="h-6 w-6 mb-2" />
              <span className="font-medium">Producteur</span>
              <span className="text-xs text-muted-foreground mt-1">Je souhaite vendre</span>
              {selectedRole === 'PRODUCER' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-custom-accent" />
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
            className="space-y-2"
          >
            <label htmlFor="companyName" className="form-label flex items-center gap-2">
              <Building className="h-4 w-4 text-custom-accent" />
              Nom de l'entreprise
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className={cn(
                "form-input",
                fieldErrors.companyName && "border-destructive"
              )}
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
              className="h-4 w-4 rounded border-input text-custom-accent focus:ring-custom-accent"
              required
            />
          </div>
          <div className="ml-3">
            <label htmlFor="terms" className="text-sm">
              J'accepte les{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium text-custom-accent hover:opacity-90 transition-opacity"
              >
                conditions d'utilisation
              </Link>{' '}
              et la{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-custom-accent hover:opacity-90 transition-opacity"
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
            className="p-3 rounded-md bg-destructive/10 border border-destructive"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Bouton de soumission */}
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          disabled={!selectedRole || !acceptTerms}
          className="w-full py-2 text-base font-medium"
        >
          S'inscrire
        </LoadingButton>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-foreground/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou s'inscrire avec
            </span>
          </div>
        </div>

        {/* Connexion avec Google */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
        >
          <FcGoogle className="h-5 w-5" />
          <span>Google</span>
        </button>
      </form>
    </motion.div>
  )
}