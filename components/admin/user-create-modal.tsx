// components/admin/user-create-modal.tsx
'use client'

import { useState } from 'react'
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
  name: string | null
  email: string
  phone: string | null
  role: UserRole
}

interface UserCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => void
}

export function UserCreateModal({ isOpen, onClose, onSubmit }: UserCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    role: 'CLIENT'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Email obligatoire
    if (!formData.email) {
      newErrors.email = "L'email est requis"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide"
    }
    
    // Téléphone OBLIGATOIRE - Format international flexible
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = "Le téléphone est requis"
    } else {
      const phone = formData.phone.trim()
      // Validation très permissive - accepte tous formats avec ou sans indicatif
      // Minimum 6 chiffres, maximum 20, accepte +, espaces, tirets, parenthèses
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{6,20}$/
      if (!phoneRegex.test(phone)) {
        newErrors.phone = "Format de téléphone invalide"
      }
    }
    
    // Rôle obligatoire
    if (!formData.role) {
      newErrors.role = "Le rôle est requis"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      // Nettoyer les données avant envoi
      const cleanedData = {
        ...formData,
        name: formData.name?.trim() || null,
        email: formData.email?.trim(),
        phone: formData.phone?.trim(), // Plus de fallback null - obligatoire
      }
      
      await onSubmit(cleanedData)
      
      // Reset du formulaire après succès
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'CLIENT'
      })
      setErrors({})
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      // L'erreur sera gérée par le composant parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouvel utilisateur dans le système.
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
              Téléphone <span className="text-destructive">*</span>
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
              required
            />
            {errors.phone && (
              <p className="form-error">{errors.phone}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Tous formats acceptés : +41791234567 (Suisse), +33612345678 (France), +1234567890 (USA), etc.
            </p>
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
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <LoadingButton type="submit" isLoading={isSubmitting}>
              Créer l'utilisateur
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}