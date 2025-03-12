'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { Eye, EyeOff } from 'lucide-react'
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-montserrat text-title">
          Nom complet <span className="text-custom-accent">*</span>
        </label>
        <input
          ref={nameRef}
          id="name"
          name="name"
          type="text"
          required
          className={cn(
            "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors",
            fieldErrors.name && "border-destructive focus:border-destructive focus:ring-destructive"
          )}
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-montserrat text-title">
          Email <span className="text-custom-accent">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={cn(
            "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors",
            fieldErrors.email && "border-destructive focus:border-destructive focus:ring-destructive"
          )}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-montserrat text-title">
          Téléphone <span className="text-custom-accent">*</span>
        </label>
        <div className="mt-1">
          <PhoneInput
            international
            defaultCountry="CH"
            value={phoneNumber}
            onChange={setPhoneNumber}
            className={cn(
              "block w-full rounded-md border border-foreground/10 bg-background text-foreground transition-colors",
              fieldErrors.phone && "border-destructive focus:border-destructive focus:ring-destructive [&>*]:border-destructive"
            )}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-montserrat text-title">
          Mot de passe <span className="text-custom-accent">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-10 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors",
              fieldErrors.password && "border-destructive focus:border-destructive focus:ring-destructive"
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
          Confirmer le mot de passe <span className="text-custom-accent">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={cn(
              "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-10 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors",
              fieldErrors.confirmPassword && "border-destructive focus:border-destructive focus:ring-destructive"
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

      <div>
        <label className="block text-sm font-montserrat text-title">
          Type de compte <span className="text-custom-accent">*</span>
        </label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              id="client"
              name="role"
              type="radio"
              value={UserRole.CLIENT}
              required
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
            />
            <label htmlFor="client" className="ml-2 text-sm font-roboto text-foreground">
              Client
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="producer"
              name="role"
              type="radio"
              value={UserRole.PRODUCER}
              required
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
            />
            <label htmlFor="producer" className="ml-2 text-sm font-roboto text-foreground">
              Producteur
            </label>
          </div>
        </div>
      </div>

      {selectedRole === UserRole.PRODUCER && (
        <div>
          <label htmlFor="companyName" className="block text-sm font-montserrat text-title">
            Nom de l'entreprise <span className="text-custom-accent">*</span>
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className={cn(
              "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent transition-colors",
              fieldErrors.companyName && "border-destructive focus:border-destructive focus:ring-destructive"
            )}
          />
        </div>
      )}

      <div className="flex items-start mt-4">
        <div className="flex items-center h-5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent rounded"
            required
          />
        </div>
        <div className="ml-3">
          <label htmlFor="terms" className="text-sm text-foreground">
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

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive">
          <p className="text-sm font-roboto text-destructive">{error}</p>
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          disabled={!selectedRole || !acceptTerms}
        >
          S'inscrire
        </LoadingButton>
      </div>

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

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="w-full flex items-center justify-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground hover:bg-foreground/5 transition-colors"
      >
        <FcGoogle className="h-5 w-5" />
        <span>Google</span>
      </button>
    </form>
  )
}