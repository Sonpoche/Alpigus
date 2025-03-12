// app/(protected)/profile/complete/page.tsx
'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import { LoadingButton } from '@/components/ui/loading-button'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import 'react-phone-number-input/style.css'

type FieldErrors = {
  phone?: boolean;
  role?: boolean;
  companyName?: boolean;
}

export default function CompleteProfilePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { data: session, update } = useSession()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<E164Number | undefined>()
  const [companyName, setCompanyName] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setFieldErrors({})

    // Validation
    if (!selectedRole || !phoneNumber || !acceptTerms) {
      setIsLoading(false)
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis et accepter les conditions d'utilisation",
        variant: "destructive"
      })
      return
    }

    if (selectedRole === UserRole.PRODUCER && !companyName) {
      setFieldErrors(prev => ({ ...prev, companyName: true }))
      setIsLoading(false)
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est requis pour les producteurs",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/users/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: selectedRole,
          phone: phoneNumber,
          ...(selectedRole === UserRole.PRODUCER && { companyName }),
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du profil')
      }

      const updatedUser = await response.json()

      // Mise à jour de la session avec les nouvelles données
      await update({
        ...session,
        user: {
          ...session?.user,
          ...updatedUser
        }
      })

      toast({
        title: "Profil complété",
        description: "Votre profil a été mis à jour avec succès"
      })

      router.refresh()
      router.push('/dashboard')

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-6 bg-background border border-foreground/10 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold font-montserrat text-title">
            Complétez votre profil
          </h2>
          <p className="mt-2 text-center text-sm font-roboto text-foreground/60">
            Ces informations sont nécessaires pour accéder à toutes les fonctionnalités
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Téléphone */}
          <div>
            <label className="block text-sm font-montserrat text-title mb-2">
              Numéro de téléphone <span className="text-custom-accent">*</span>
            </label>
            <PhoneInput
              international
              defaultCountry="CH"
              value={phoneNumber}
              onChange={setPhoneNumber}
              className={cn(
                "block w-full rounded-md border border-foreground/10 bg-background text-foreground",
                fieldErrors.phone && "border-destructive"
              )}
            />
          </div>

          {/* Type de compte */}
          <div>
            <label className="block text-sm font-montserrat text-title mb-2">
              Type de compte <span className="text-custom-accent">*</span>
            </label>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="client"
                  name="role"
                  type="radio"
                  value={UserRole.CLIENT}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <label htmlFor="client" className="ml-3 block text-sm font-roboto text-foreground">
                  Client - Je souhaite acheter des produits
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="producer"
                  name="role"
                  type="radio"
                  value={UserRole.PRODUCER}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <label htmlFor="producer" className="ml-3 block text-sm font-roboto text-foreground">
                  Producteur - Je souhaite vendre mes produits
                </label>
              </div>
            </div>
          </div>

          {/* Nom de l'entreprise (conditionnel) */}
          {selectedRole === UserRole.PRODUCER && (
            <div>
              <label htmlFor="companyName" className="block text-sm font-montserrat text-title">
                Nom de l'entreprise <span className="text-custom-accent">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={cn(
                  "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent",
                  fieldErrors.companyName && "border-destructive"
                )}
                required
              />
            </div>
          )}

          {/* Conditions d'utilisation */}
          <div className="flex items-start">
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

          <LoadingButton 
            type="submit" 
            isLoading={isLoading}
            disabled={!selectedRole || !phoneNumber || !acceptTerms || (selectedRole === UserRole.PRODUCER && !companyName)}
          >
            Compléter mon profil
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}