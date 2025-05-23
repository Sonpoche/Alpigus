// components/auth/login-form.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
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
        callbackUrl: '/dashboard',
        remember: rememberMe
      })

      if (signInResult?.error) {
        identifyFieldError(signInResult.error)
        throw new Error('Identifiants invalides')
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Mushroom Marketplace"
      })

      router.push('/dashboard')
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
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="form-label flex items-center gap-2">
            <Mail className="h-4 w-4 text-custom-accent" />
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            required
            className={cn(
              "form-input",
              fieldErrors.email && "border-destructive"
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="form-label flex items-center gap-2">
              <Lock className="h-4 w-4 text-custom-accent" />
              Mot de passe
            </label>
            <Link 
              href="/reset-password"
              className="text-sm font-medium text-custom-accent hover:opacity-90 transition-opacity"
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

        <div className="flex items-center">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-input text-custom-accent focus:ring-custom-accent"
          />
          <label htmlFor="remember" className="ml-2 block text-sm text-foreground">
            Se souvenir de moi
          </label>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-md bg-destructive/10 border border-destructive"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        <LoadingButton 
          type="submit" 
          isLoading={isLoading}
          className="w-full"
        >
          Se connecter
        </LoadingButton>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-foreground/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continuer avec
            </span>
          </div>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
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