// app/(protected)/producer/settings/bankinfo/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { Building, ArrowLeft, Landmark } from 'lucide-react'
import Link from 'next/link'

export default function BankInfoSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [producerData, setProducerData] = useState<any>(null)
  const [formData, setFormData] = useState({
    bankName: '',
    bankAccountName: '',
    iban: '',
    bic: ''
  })
  const [errors, setErrors] = useState({
    bankName: '',
    bankAccountName: '',
    iban: ''
  })

  useEffect(() => {
    fetchProducerData()
  }, [])

  const fetchProducerData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users/producer-profile')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données')
      }
      
      const data = await response.json()
      setProducerData(data)
      
      // Initialiser le formulaire avec les données existantes
      setFormData({
        bankName: data.bankName || '',
        bankAccountName: data.bankAccountName || '',
        iban: data.iban || '',
        bic: data.bic || ''
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du producteur",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Effacer l'erreur lorsque l'utilisateur modifie le champ
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {
      bankName: '',
      bankAccountName: '',
      iban: ''
    }
    
    let isValid = true
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Veuillez indiquer le nom de votre banque'
      isValid = false
    }
    
    if (!formData.bankAccountName.trim()) {
      newErrors.bankAccountName = 'Veuillez indiquer le nom du titulaire du compte'
      isValid = false
    }
    
    if (!formData.iban.trim()) {
      newErrors.iban = 'Veuillez indiquer votre IBAN'
      isValid = false
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(formData.iban.replace(/\s+/g, ''))) {
      newErrors.iban = 'Format IBAN invalide'
      isValid = false
    }
    
    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setIsSaving(true)
      
      // Formatter l'IBAN (supprimer les espaces)
      const formattedData = {
        ...formData,
        iban: formData.iban.replace(/\s+/g, '')
      }
      
      const response = await fetch(`/api/producers/${producerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des informations bancaires')
      }
      
      toast({
        title: "Succès",
        description: "Vos informations bancaires ont été mises à jour avec succès"
      })
      
      router.push('/producer/settings')
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour vos informations bancaires",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/producer/settings" 
          className="flex items-center text-custom-text hover:text-custom-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux paramètres
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Informations bancaires</h1>
      <p className="text-muted-foreground mb-8">
        Ces informations sont nécessaires pour recevoir vos paiements
      </p>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium mb-1">
                Nom de la banque <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className={`w-full border ${errors.bankName ? 'border-red-500' : 'border-foreground/10'} rounded-md p-2`}
                placeholder="ex: Crédit Suisse"
              />
              {errors.bankName && (
                <p className="mt-1 text-xs text-red-500">{errors.bankName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="bankAccountName" className="block text-sm font-medium mb-1">
                Nom du titulaire <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="bankAccountName"
                name="bankAccountName"
                value={formData.bankAccountName}
                onChange={handleInputChange}
                className={`w-full border ${errors.bankAccountName ? 'border-red-500' : 'border-foreground/10'} rounded-md p-2`}
                placeholder="ex: Jean Dupont"
              />
              {errors.bankAccountName && (
                <p className="mt-1 text-xs text-red-500">{errors.bankAccountName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="iban" className="block text-sm font-medium mb-1">
                IBAN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="iban"
                name="iban"
                value={formData.iban}
                onChange={handleInputChange}
                className={`w-full border ${errors.iban ? 'border-red-500' : 'border-foreground/10'} rounded-md p-2`}
                placeholder="ex: CH93 0076 2011 6238 5295 7"
              />
              {errors.iban && (
                <p className="mt-1 text-xs text-red-500">{errors.iban}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="bic" className="block text-sm font-medium mb-1">
                BIC/SWIFT <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="text"
                id="bic"
                name="bic"
                value={formData.bic}
                onChange={handleInputChange}
                className="w-full border border-foreground/10 rounded-md p-2"
                placeholder="ex: CRESCHZZ80A"
              />
            </div>
          </div>
          
          <div className="mt-8">
            <LoadingButton
              type="submit"
              isLoading={isSaving}
              className="w-full"
            >
              Enregistrer
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}