// Chemin du fichier: components/auth/login-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { Eye, EyeOff } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { motion } from 'framer-motion'

type FieldErrors = {
  email?: boolean;
  password?: boolean;
}

export function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus()
    }
  }, [])

  const identifyFieldError = (errorMessage: string) => {
    const newFieldErrors: FieldErrors = {}
    
    if (errorMessage === 'Identifiants invalides') {
      newFieldErrors.email = true
      newFieldErrors.password = true
    }
    if (errorMessage.includes('email')) {
      newFieldErrors.email = true
    }
    if (errorMessage.includes('mot de passe')) {
      newFieldErrors.password = true
    }

    setFieldErrors(newFieldErrors)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const formData = new FormData(event.currentTarget)
      const signInResult = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false,
        callbackUrl: '/tableau-de-bord',
        remember: rememberMe
      })

      if (signInResult?.error) {
        identifyFieldError(signInResult.error)
        throw new Error('Identifiants invalides')
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue"
      })

      router.push('/tableau-de-bord')
      router.refresh()
    } catch (error: any) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            required
            className={cn(
              "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white text-black",
              fieldErrors.email && "border-red-500"
            )}
            placeholder="votre@email.com"
          />
        </div>

        {/* Mot de passe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-black">
              Mot de passe
            </label>
            <Link 
              href="/mot-de-passe-oublie"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
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
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Se souvenir de moi */}
        <div className="flex items-center">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black focus:ring-offset-0"
          />
          <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
            Se souvenir de moi
          </label>
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

        {/* Bouton de connexion */}
        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          Se connecter
        </LoadingButton>

        {/* Séparateur avec texte */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 text-sm text-gray-500 bg-white">
              Ou continuer avec
            </span>
          </div>
        </div>

        {/* Bouton Google */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/tableau-de-bord' })}
          className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-gray-50 transition-colors"
          type="button"
          disabled={isLoading}
        >
          <FcGoogle className="h-5 w-5" />
          <span>Google</span>
        </button>
      </form>
    </motion.div>
  )
}