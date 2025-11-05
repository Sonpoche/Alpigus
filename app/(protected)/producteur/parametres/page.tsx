// app/(protected)/producer/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  User,
  CreditCard,
  Building,
  Mail,
  Phone,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Landmark
} from 'lucide-react'
import Link from 'next/link'

export default function ProducerSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [producerData, setProducerData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Récupérer les données utilisateur et producteur
        const [userResponse, producerResponse] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/users/producer-profile')
        ])
        
        if (!userResponse.ok || !producerResponse.ok) {
          throw new Error('Erreur lors du chargement des données')
        }
        
        const userData = await userResponse.json()
        const producerData = await producerResponse.json()
        
        setUserData(userData)
        setProducerData(producerData)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger vos données",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [toast])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Paramètres du compte</h1>
      <p className="text-muted-foreground mb-8">
        Gérez vos informations personnelles et professionnelles
      </p>
      
      {/* Profil personnel */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profil personnel</h2>
              <p className="text-sm text-muted-foreground">
                Informations de contact personnelles
              </p>
            </div>
          </div>
          
          <Link 
            href="/profile"
            className="text-custom-accent hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
          >
            Modifier <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="font-medium">{userData?.name || "Non renseigné"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userData?.email || "Non renseigné"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
              <p className="font-medium">{userData?.phone || "Non renseigné"}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profil producteur */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profil producteur</h2>
              <p className="text-sm text-muted-foreground">
                Informations de votre entreprise
              </p>
            </div>
          </div>
          
          <Link 
            href="/producer/profile"
            className="text-custom-accent hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
          >
            Modifier <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Nom de l'entreprise</p>
              <p className="font-medium">{producerData?.companyName || "Non renseigné"}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-foreground/5 rounded-lg">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
              <p className="font-medium">{producerData?.address || "Non renseignée"}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Informations bancaires */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-custom-accent/10 rounded-full">
              <Landmark className="h-6 w-6 text-custom-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Informations bancaires</h2>
              <p className="text-sm text-muted-foreground">
                Coordonnées pour recevoir vos paiements
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!producerData?.iban ? (
              <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 rounded-full">
                Non configuré
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Configuré
              </span>
            )}
            
            <Link 
              href="/producer/settings/bankinfo"
              className="text-custom-accent hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-1"
            >
              {!producerData?.iban ? "Configurer" : "Modifier"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Informations bancaires actuelles */}
          {producerData?.iban ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Banque</p>
                  <p className="font-medium">{producerData.bankName || "Non renseignée"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Titulaire</p>
                  <p className="font-medium">{producerData.bankAccountName || "Non renseigné"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg md:col-span-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="font-medium">{producerData.iban ? `${producerData.iban.substring(0, 4)}...${producerData.iban.substring(producerData.iban.length - 4)}` : "Non renseigné"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Informations bancaires requises
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Pour recevoir les paiements de vos ventes, vous devez configurer vos informations bancaires.
                </p>
              </div>
            </div>
          )}
          
          {/* Informations sur la commission et les paiements */}
          <div className="p-4 bg-foreground/5 rounded-lg">
            <h3 className="font-medium mb-2">Commissions et paiements</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Mushroom Marketplace prélève une commission de {process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE || 10}% sur chaque vente réalisée via la plateforme.
            </p>
            <p className="text-sm text-muted-foreground">
              Les paiements sont traités manuellement tous les 15 jours, sous réserve d'un montant minimum de 50 CHF dans votre portefeuille.
            </p>
          </div>
        </div>
        
        {/* Lien vers le portefeuille */}
        <div className="mt-6 text-center">
          <Link 
            href="/producer/wallet"
            className="inline-flex items-center gap-2 text-custom-accent hover:underline font-medium"
          >
            <CreditCard className="h-4 w-4" />
            Gérer mon portefeuille
          </Link>
        </div>
      </div>
    </div>
  )
}