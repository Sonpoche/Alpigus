// Chemin du fichier: components/admin/user-create-modal.tsx
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
    
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = "Le téléphone est requis"
    } else {
      const phone = formData.phone.trim()
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{6,20}$/
      if (!phoneRegex.test(phone)) {
        newErrors.phone = "Format de téléphone invalide"
      }
    }
    
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
      const cleanedData = {
        ...formData,
        name: formData.name?.trim() || null,
        email: formData.email?.trim(),
        phone: formData.phone?.trim(),
      }
      
      await onSubmit(cleanedData)
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'CLIENT'
      })
      setErrors({})
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-black rounded-lg">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="text-2xl font-bold text-black">Créer un nouvel utilisateur</DialogTitle>
          <DialogDescription className="text-gray-600">
            Remplissez les informations pour créer un nouvel utilisateur dans le système.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-black mb-2">
              Nom (optionnel)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
              placeholder="Nom complet"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-black mb-2">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border-2 rounded-md focus:outline-none ${
                errors.email ? 'border-red-600 focus:border-red-600' : 'border-gray-300 focus:border-black'
              }`}
              placeholder="email@exemple.com"
              required
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-black mb-2">
              Téléphone <span className="text-red-600">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border-2 rounded-md focus:outline-none ${
                errors.phone ? 'border-red-600 focus:border-red-600' : 'border-gray-300 focus:border-black'
              }`}
              placeholder="+41791234567"
              required
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.phone}</p>
            )}
            <p className="text-xs text-gray-600 mt-1">
              Tous formats acceptés : +41791234567 (Suisse), +33612345678 (France), etc.
            </p>
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-bold text-black mb-2">
              Rôle <span className="text-red-600">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none bg-white"
              required
            >
              <option value="CLIENT">Client</option>
              <option value="PRODUCER">Producteur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          
          <DialogFooter className="mt-6 flex gap-3 pt-4 border-t-2 border-gray-200">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold"
            >
              Annuler
            </button>
            <LoadingButton 
              type="submit" 
              isLoading={isSubmitting}
              className="flex-1 bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2.5 rounded-md font-semibold"
            >
              Créer l'utilisateur
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}