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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'CLIENT'
      })
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