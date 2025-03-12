// components/profile/edit-profile-form.tsx
'use client'

import { useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import 'react-phone-number-input/style.css'

interface ProfileFormData {
  name: string | null
  email: string | null
  phone: string | undefined | null
}

interface EditProfileFormProps {
  initialData: ProfileFormData
  onSubmit: (data: ProfileFormData) => Promise<void>
  onCancel: () => void
}

export function EditProfileForm({ initialData, onSubmit, onCancel }: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<E164Number | undefined>(initialData.phone as E164Number)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const name = formData.get('name') as string || initialData.name
    const email = formData.get('email') as string || initialData.email
    
    try {
      await onSubmit({
        name: name || null,
        email: email || null,
        phone: phoneNumber || null,
      })
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la mise à jour du profil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-montserrat text-title">
          Nom complet
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initialData.name || ''}
          className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-montserrat text-title">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={initialData.email || ''}
          className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-montserrat text-title">
          Téléphone
        </label>
        <div className="mt-1">
          <PhoneInput
            international
            defaultCountry="CH"
            value={phoneNumber}
            onChange={setPhoneNumber}
            className="block w-full rounded-md border border-foreground/10 bg-background text-foreground"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm font-roboto text-custom-accent">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-custom-accent text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-montserrat"
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 border border-foreground/10 py-2 px-4 rounded-md hover:bg-foreground/5 transition-colors font-montserrat"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}