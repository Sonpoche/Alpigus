// components/admin/user-edit-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/simple-dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: UserRole
  producer?: {
    id: string
    companyName: string | null
  } | null
}

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => void
  user: User
}

export function UserEditModal({ isOpen, onClose, onSubmit, user }: UserEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    role: 'CLIENT'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showProducerFields, setShowProducerFields] = useState(false)
  const [producerData, setProducerData] = useState({
    companyName: ''
  })

  // Initialiser les données du formulaire
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      })
      
      setShowProducerFields(user.role === 'PRODUCER')
      
      if (user.producer) {
        setProducerData({
          companyName: user.producer.companyName || ''
        })
      }
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Toggle producer fields when role changes
    if (name === 'role') {
      setShowProducerFields(value === 'PRODUCER')
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleProducerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProducerData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide"
    }

    if (formData.phone && !/^\+?[0-9\s\-\(\)]{8,15}$/.test(formData.phone)) {
      newErrors.phone = "Format de téléphone invalide"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Modification pour le gestionnaire de soumission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!validateForm()) return
  
  setIsSubmitting(true)
  try {
    // Préparer les données à soumettre
    const dataToSubmit: Partial<User> = { ...formData }
    
    // Ajouter les données de producteur si nécessaire
    if (showProducerFields) {
      // S'assurer que producer et producer.id existent
      if (user.producer && user.producer.id) {
        dataToSubmit.producer = {
          id: user.producer.id, // On s'assure que l'ID est défini
          companyName: producerData.companyName
        }
      } else {
        // Si pas de producer existant, on n'inclut pas l'ID
        dataToSubmit.producer = {
          companyName: producerData.companyName
        } as any // Utiliser 'as any' pour contourner temporairement la vérification de type
      }
    }
    
    await onSubmit(dataToSubmit)
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'utilisateur.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label htmlFor="name" className="form-label">
              Nom (optionnel)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name || ''}
              onChange={handleChange}
              className="form-input"
              placeholder="Nom complet"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="form-label">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`form-input ${
                errors.email ? 'border-destructive' : ''
              }`}
              placeholder="email@exemple.com"
              required
            />
            {errors.email && (
              <p className="form-error">{errors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="form-label">
              Téléphone (optionnel)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={handleChange}
              className={`form-input ${
                errors.phone ? 'border-destructive' : ''
              }`}
              placeholder="+41791234567"
            />
            {errors.phone && (
              <p className="form-error">{errors.phone}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="role" className="form-label">
              Rôle <span className="text-destructive">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="CLIENT">Client</option>
              <option value="PRODUCER">Producteur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          
          {/* Champs pour les producteurs */}
          {showProducerFields && (
            <div className="border border-input p-4 rounded-md bg-muted/20">
              <h3 className="text-sm font-medium mb-3 text-foreground">Informations du producteur</h3>
              
              <div>
                <label htmlFor="companyName" className="form-label">
                  Nom de l'entreprise
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={producerData.companyName}
                  onChange={handleProducerChange}
                  className="form-input"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <LoadingButton type="submit" isLoading={isSubmitting}>
              Enregistrer les modifications
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}