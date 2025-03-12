'use client'

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { EditProfileForm } from "@/components/profile/edit-profile-form"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface ProfileFormData {
  name: string | null
  email: string | null
  phone: string | undefined | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, update: updateSession } = useSession()
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      const updateStatus = localStorage.getItem('profileUpdate')
      if (updateStatus === 'success') {
        toast({
          title: "Profil mis à jour",
          description: "Vos modifications ont été enregistrées avec succès",
          duration: 3000,
        })
        localStorage.removeItem('profileUpdate')
      }
    }, 500)
  }, [toast])

  async function handleUpdateProfile(data: ProfileFormData) {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData)
      }

      const updatedUser = await response.json()

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          ...updatedUser
        }
      })

      localStorage.setItem('profileUpdate', 'success')
      setIsEditing(false)
      window.location.href = '/profile'
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
        duration: 3000,
      })
      throw error
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-montserrat font-bold text-custom-title mb-6">
          Profil Utilisateur
        </h1>

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-montserrat text-custom-text/60">Nom</h2>
              <p className="text-custom-text">{session?.user?.name || '-'}</p>
            </div>
            <div>
              <h2 className="text-sm font-montserrat text-custom-text/60">Email</h2>
              <p className="text-custom-text">{session?.user?.email || '-'}</p>
            </div>
            <div>
              <h2 className="text-sm font-montserrat text-custom-text/60">Téléphone</h2>
              <p className="text-custom-text">{session?.user?.phone || '-'}</p>
            </div>
            <div>
              <h2 className="text-sm font-montserrat text-custom-text/60">Type de compte</h2>
              <p className="text-custom-text">{session?.user?.role || '-'}</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Modifier le profil
            </button>
          </div>
        ) : (
          <EditProfileForm
            initialData={{
              name: session?.user?.name ?? null,
              email: session?.user?.email ?? null,
              phone: session?.user?.phone ?? null,
            }}
            onSubmit={handleUpdateProfile}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </div>
    </div>
  )
}