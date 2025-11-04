// Chemin du fichier: components/admin/user-edit-modal.tsx
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
import { Building } from 'lucide-react'

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
    
    if (name === 'role') {
      setShowProducerFields(value === 'PRODUCER')
    }
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      const dataToSubmit: Partial<User> = { ...formData }
      
      if (showProducerFields) {
        if (user.producer && user.producer.id) {
          dataToSubmit.producer = {
            id: user.producer.id,
            companyName: producerData.companyName
          }
        } else {
          dataToSubmit.producer = {
            companyName: producerData.companyName
          } as any
        }
      }
      
      await onSubmit(dataToSubmit)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-black rounded-lg">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="text-2xl font-bold text-black">Modifier l'utilisateur</DialogTitle>
          <DialogDescription className="text-gray-600">
            Modifiez les informations de l'utilisateur.
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
              Téléphone (optionnel)
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
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.phone}</p>
            )}
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
          
          {showProducerFields && (
            <div className="border-2 border-gray-300 p-4 rounded-lg bg-gray-50">
              <h3 className="text-sm font-bold mb-3 text-black flex items-center gap-2">
                <Building className="h-4 w-4" />
                Informations du producteur
              </h3>
              
              <div>
                <label htmlFor="companyName" className="block text-sm font-bold text-black mb-2">
                  Nom de l'entreprise
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={producerData.companyName}
                  onChange={handleProducerChange}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none bg-white"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>
          )}
          
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
              Enregistrer les modifications
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}