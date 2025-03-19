// app/(protected)/profile/page.tsx
'use client'

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { EditProfileForm } from "@/components/profile/edit-profile-form"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Edit2,
  Building,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  LogOut
} from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { signOut } from "next-auth/react"
import Link from "next/link"

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
  const [isEditingProducer, setIsEditingProducer] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [producerData, setProducerData] = useState<any>(null)
  
  useEffect(() => {
    // Afficher le message de succès si demandé
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
    
    // Charger les données du producteur si l'utilisateur est un producteur
    const fetchProducerData = async () => {
      if (session?.user?.role === 'PRODUCER') {
        try {
          const response = await fetch('/api/users/producer-profile')
          if (response.ok) {
            const data = await response.json()
            setProducerData(data)
          }
        } catch (error) {
          console.error('Erreur lors du chargement des données du producteur:', error)
        }
      }
      setIsLoading(false)
    }
    
    if (session) {
      fetchProducerData()
    }
  }, [session, toast])

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  const renderProfileTab = () => (
    <div className="space-y-8">
      {/* Section des informations personnelles */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-foreground/10 flex justify-between items-center">
          <h2 className="font-semibold">Informations personnelles</h2>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-custom-accent flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <Edit2 className="h-4 w-4" /> Modifier
            </button>
          )}
        </div>
        
        {!isEditing ? (
          <div className="p-6">
            <div className="flex mb-8">
              <div className="w-20 h-20 rounded-full bg-custom-accentLight text-custom-accent flex items-center justify-center text-2xl font-bold mr-6">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-custom-title">{session?.user?.name || 'Utilisateur'}</h1>
                <p className="text-sm text-muted-foreground">{session?.user?.role || 'Aucun rôle'}</p>
                
                <div className="mt-2">
                  <Badge 
                    variant={session?.user?.role ? 'success' : 'warning'}
                    className="text-xs"
                  >
                    {session?.user?.role ? 'Profil complété' : 'Profil incomplet'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <User className="h-5 w-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="font-medium">{session?.user?.name || '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{session?.user?.email || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{session?.user?.phone || '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type de compte</p>
                    <p className="font-medium">{session?.user?.role || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <EditProfileForm
              initialData={{
                name: session?.user?.name ?? null,
                email: session?.user?.email ?? null,
                phone: session?.user?.phone ?? null,
              }}
              onSubmit={handleUpdateProfile}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        )}
      </div>
      
      {/* Section des informations du producteur (si producteur) */}
      {session?.user?.role === 'PRODUCER' && (
        <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-foreground/10 flex justify-between items-center">
            <h2 className="font-semibold">Informations du producteur</h2>
            
            {!isEditingProducer && (
              <button
                onClick={() => setIsEditingProducer(true)}
                className="text-sm text-custom-accent flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <Edit2 className="h-4 w-4" /> Modifier
              </button>
            )}
          </div>
          
          <div className="p-6">
            {!isEditingProducer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                      <Building className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nom de l'entreprise</p>
                      <p className="font-medium">{producerData?.companyName || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{producerData?.address || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center mt-1">
                      <Edit2 className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{producerData?.description || 'Aucune description disponible.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-montserrat text-title">
                    Nom de l'entreprise
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    defaultValue={producerData?.companyName || ''}
                    className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-montserrat text-title">
                    Adresse
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    defaultValue={producerData?.address || ''}
                    className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-montserrat text-title">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    defaultValue={producerData?.description || ''}
                    className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-foreground focus:border-custom-accent focus:ring-1 focus:ring-custom-accent"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Récupérer les valeurs des champs
                        const companyName = (document.getElementById('companyName') as HTMLInputElement)?.value;
                        const address = (document.getElementById('address') as HTMLInputElement)?.value;
                        const description = (document.getElementById('description') as HTMLTextAreaElement)?.value;
                        
                        // Appel à l'API pour mettre à jour les données du producteur
                        const response = await fetch('/api/users/producer-profile', {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            companyName,
                            address,
                            description
                          }),
                        });
                        
                        if (!response.ok) {
                          throw new Error('Erreur lors de la mise à jour du profil producteur');
                        }
                        
                        const updatedProducer = await response.json();
                        setProducerData(updatedProducer);
                        setIsEditingProducer(false);
                        
                        toast({
                          title: "Profil producteur mis à jour",
                          description: "Vos modifications ont été enregistrées avec succès",
                          duration: 3000,
                        });
                      } catch (error: any) {
                        toast({
                          title: "Erreur",
                          description: error.message || "Une erreur est survenue lors de la mise à jour",
                          variant: "destructive",
                          duration: 3000,
                        });
                      }
                    }}
                    className="flex-1 bg-custom-accent text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-montserrat"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProducer(false)}
                    className="flex-1 border border-foreground/10 py-2 px-4 rounded-md hover:bg-foreground/5 transition-colors font-montserrat"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Section des statistiques du compte */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h2 className="font-semibold">Statistiques du compte</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-foreground/5 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <Clock className="h-8 w-8 text-foreground/60" />
              </div>
              <p className="text-2xl font-bold">{new Date().getFullYear()}</p>
              <p className="text-sm text-muted-foreground">Année d'inscription</p>
            </div>
            
            <div className="bg-foreground/5 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Commandes complétées</p>
            </div>
            
            <div className="bg-foreground/5 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Commandes en cours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  
  const renderSecurityTab = () => (
    <div className="space-y-8">
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h2 className="font-semibold">Sécurité du compte</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                <Lock className="h-5 w-5 text-foreground/60" />
              </div>
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">Modifiez votre mot de passe</p>
              </div>
            </div>
            
            <Link 
              href="/reset-password"
              className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 transition-colors rounded-md text-sm font-medium"
            >
              Changer
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                <Mail className="h-5 w-5 text-foreground/60" />
              </div>
              <div>
                <p className="font-medium">Vérification de l'email</p>
                <p className="text-sm text-muted-foreground">Statut de vérification de votre email</p>
              </div>
            </div>
            
            <Badge 
              variant="success"
              className="px-3 py-1"
            >
              Vérifié
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Déconnexion</p>
                <p className="text-sm text-muted-foreground">Se déconnecter de tous les appareils</p>
              </div>
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-white bg-destructive hover:bg-destructive/90 transition-colors rounded-md text-sm font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h2 className="font-semibold">Sessions actives</h2>
        </div>
        
        <div className="p-6">
          <div className="bg-foreground/5 rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">Session actuelle</p>
              <p className="text-sm text-muted-foreground">
                Navigateur: {typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Autre') : 'Autre'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dernière activité: {new Date().toLocaleString()}
              </p>
            </div>
            
            <Badge variant="success" className="px-2 py-1">Actif</Badge>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mon profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>
      
      {/* Onglets */}
      <div className="border-b border-foreground/10 mb-8">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-medium text-sm relative ${
              activeTab === 'profile' 
                ? 'text-custom-accent' 
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Profil
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="activeProfileTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-accent" 
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 font-medium text-sm relative ${
              activeTab === 'security' 
                ? 'text-custom-accent' 
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Sécurité
            {activeTab === 'security' && (
              <motion.div 
                layoutId="activeProfileTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-accent" 
              />
            )}
          </button>
        </div>
      </div>
      
      {/* Contenu de l'onglet actif */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'security' && renderSecurityTab()}
      </motion.div>
    </div>
  )
}