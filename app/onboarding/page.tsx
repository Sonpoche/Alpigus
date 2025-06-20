// app/onboarding/page.tsx

"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, CheckCircle, User, Building, CreditCard, Shield } from "lucide-react"

// Import du composant PasswordStrength
const PasswordStrength = React.lazy(() => 
  import("@/components/ui/password-strength").then(module => ({ default: module.PasswordStrength }))
)

interface OnboardingData {
  // Étape 1: Changement de mot de passe
  currentPassword: string
  newPassword: string
  confirmPassword: string
  
  // Étape 2: Informations personnelles
  name: string
  phone: string
  
  // Étape 3: Informations producteur (si applicable)
  companyName: string
  description: string
  address: string
  siretNumber: string
  
  // Étape 4: Informations bancaires (si producteur)
  bankAccountNumber: string
  bankAccountName: string
}

const STEPS = [
  { id: 1, title: "Sécurité", icon: Shield, description: "Changez votre mot de passe temporaire" },
  { id: 2, title: "Profil", icon: User, description: "Complétez vos informations personnelles" },
  { id: 3, title: "Entreprise", icon: Building, description: "Informations de votre entreprise" },
  { id: 4, title: "Paiement", icon: CreditCard, description: "Coordonnées bancaires" }
]

export default function OnboardingPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState<OnboardingData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    name: session?.user?.name || '',
    phone: session?.user?.phone || '',
    companyName: '',
    description: '',
    address: '',
    siretNumber: '',
    bankAccountNumber: '',
    bankAccountName: ''
  })

  // Rediriger si le profil est déjà complété
  useEffect(() => {
    if (session?.user?.profileCompleted) {
      router.push('/dashboard')
    }
  }, [session, router])

  const isProducer = session?.user?.role === 'PRODUCER'
  const totalSteps = isProducer ? 4 : 2
  const progress = (currentStep / totalSteps) * 100

  const getVisibleSteps = () => {
    if (isProducer) return STEPS
    return STEPS.filter(step => step.id <= 2)
  }

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.currentPassword) return "Mot de passe actuel requis"
        if (formData.newPassword.length < 8) return "Le nouveau mot de passe doit contenir au moins 8 caractères"
        if (formData.newPassword !== formData.confirmPassword) return "Les mots de passe ne correspondent pas"
        return null
      
      case 2:
        if (!formData.name.trim()) return "Le nom est requis"
        if (!formData.phone.trim()) return "Le téléphone est requis"
        return null
      
      case 3:
        if (isProducer) {
          if (!formData.companyName.trim()) return "Le nom de l'entreprise est requis"
          if (!formData.address.trim()) return "L'adresse est requise"
        }
        return null
      
      case 4:
        if (isProducer) {
          if (!formData.bankAccountNumber.trim()) return "Le numéro de compte bancaire est requis"
          if (!formData.bankAccountName.trim()) return "Le nom du titulaire du compte est requis"
        }
        return null
      
      default:
        return null
    }
  }

  const handleNext = async () => {
    const error = validateStep(currentStep)
    if (error) {
      toast({
        title: "Erreur de validation",
        description: error,
        variant: "destructive"
      })
      return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    } else {
      await handleComplete()
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      // Mettre à jour la session
      await update({ profileCompleted: true })
      
      toast({
        title: "Profil complété !",
        description: "Bienvenue sur Mushroom Marketplace"
      })
      
      router.push('/dashboard')
    } catch (error) {
      console.error('Erreur lors de la complétion:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de terminer l'onboarding",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="form-label">Mot de passe actuel (temporaire)</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Votre mot de passe temporaire"
                  className="form-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:text-[var(--accent-color)]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="newPassword" className="form-label">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="form-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:text-[var(--accent-color)]"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {/* Composant PasswordStrength */}
              <React.Suspense fallback={<div className="h-4" />}>
                <PasswordStrength password={formData.newPassword} />
              </React.Suspense>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className="form-label">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Retapez votre nouveau mot de passe"
                  className="form-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:text-[var(--accent-color)]"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {/* Indicateur de correspondance des mots de passe */}
              {formData.confirmPassword && (
                <div className="mt-1 text-xs">
                  {formData.newPassword === formData.confirmPassword ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Les mots de passe correspondent
                    </span>
                  ) : (
                    <span className="text-red-600">
                      Les mots de passe ne correspondent pas
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="form-label">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                placeholder="Votre nom complet"
                className="form-input"
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="form-label">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
                placeholder="0612345678 ou +33612345678"
                className="form-input"
              />
            </div>
          </div>
        )

      case 3:
        if (!isProducer) return null
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName" className="form-label">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('companyName', e.target.value)}
                placeholder="Nom de votre exploitation"
                className="form-input"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="form-label">Description de l'activité</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez votre activité, vos spécialités..."
                rows={3}
                className="form-textarea"
              />
            </div>
            
            <div>
              <Label htmlFor="address" className="form-label">Adresse complète *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('address', e.target.value)}
                placeholder="Adresse complète de votre exploitation"
                rows={2}
                className="form-textarea"
              />
            </div>
            
            <div>
              <Label htmlFor="siretNumber" className="form-label">Numéro SIRET (optionnel)</Label>
              <Input
                id="siretNumber"
                value={formData.siretNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('siretNumber', e.target.value)}
                placeholder="12345678901234"
                className="form-input"
              />
            </div>
          </div>
        )

      case 4:
        if (!isProducer) return null
        return (
          <div className="space-y-4">
            <div style={{
              backgroundColor: 'var(--accent-light-color)',
              border: '1px solid rgba(255, 90, 95, 0.2)',
              padding: '1rem',
              borderRadius: '0.5rem'
            }}>
              <h4 className="font-medium mb-2" style={{ color: 'var(--accent-color)' }}>
                Pourquoi ces informations ?
              </h4>
              <p className="text-sm text-muted-foreground">
                Ces informations sont nécessaires pour vous verser les paiements de vos ventes.
                Elles sont sécurisées et ne seront pas partagées.
              </p>
            </div>
            
            <div>
              <Label htmlFor="bankAccountNumber" className="form-label">IBAN ou numéro de compte *</Label>
              <Input
                id="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bankAccountNumber', e.target.value)}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="form-input"
              />
            </div>
            
            <div>
              <Label htmlFor="bankAccountName" className="form-label">Nom du titulaire du compte *</Label>
              <Input
                id="bankAccountName"
                value={formData.bankAccountName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bankAccountName', e.target.value)}
                placeholder="Nom sur le compte bancaire"
                className="form-input"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-montserrat font-bold mb-2" style={{ color: 'var(--title-color)' }}>
            Finalisons votre profil
          </h1>
          <p style={{ color: 'var(--text-color)' }}>
            Quelques informations pour commencer sur Mushroom Marketplace
          </p>
        </div>

        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {getVisibleSteps().map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{
                      backgroundColor: isCompleted ? '#10b981' : isActive ? 'var(--accent-color)' : 'hsl(var(--muted))',
                      color: isCompleted || isActive ? 'white' : 'hsl(var(--muted-foreground))'
                    }}
                  >
                    {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-sm font-medium"
                      style={{ color: isActive ? 'var(--accent-color)' : 'hsl(var(--muted-foreground))' }}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="card">
          <CardHeader className="card-header">
            <CardTitle className="card-title flex items-center gap-2">
              {(() => {
                const currentStepData = getVisibleSteps().find(s => s.id === currentStep)
                if (currentStepData) {
                  const Icon = currentStepData.icon
                  return (
                    <>
                      <Icon size={24} />
                      {currentStepData.title}
                    </>
                  )
                }
                return null
              })()}
            </CardTitle>
            <CardDescription className="card-subtitle">
              {getVisibleSteps().find(s => s.id === currentStep)?.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="card-body">
            {renderStepContent()}
            
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
              >
                Précédent
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isLoading}
                variant="default"
              >
                {isLoading ? 'Chargement...' : 
                 currentStep === totalSteps ? 'Terminer' : 'Suivant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}