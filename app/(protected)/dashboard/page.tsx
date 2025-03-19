// app/(protected)/dashboard/page.tsx
'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  Calendar, 
  Bell, 
  Package, 
  Truck, 
  ArrowRight,
  Clock,
  Info
} from "lucide-react"
import { CompleteProfileBanner } from '@/components/profile/complete-profile-banner'
import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { formatDateToFrench } from "@/lib/date-utils"

interface DashboardStats {
  pendingOrders: number
  totalProducts: number
  upcomingDeliveries: number
  monthlyRevenue: number
}

interface RecentActivity {
  id: string
  type: 'order' | 'delivery' | 'message' | 'notification'
  title: string
  description: string
  date: Date
  status?: 'pending' | 'completed' | 'cancelled'
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    totalProducts: 0,
    upcomingDeliveries: 0,
    monthlyRevenue: 0
  })
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirection pour les administrateurs
    if (session?.user?.role === 'ADMIN') {
      router.push('/admin')
    }
    
    // Récupération des données de tableau de bord
    const fetchDashboardData = async () => {
      setIsLoading(true)
      
      // Dans un vrai scénario, vous appelleriez une API
      // Ici on simule des données pour l'exemple
      setTimeout(() => {
        // Stats simulées
        setStats({
          pendingOrders: 3,
          totalProducts: 24,
          upcomingDeliveries: 5,
          monthlyRevenue: 3450
        })
        
        // Activités récentes simulées
        setActivities([
          {
            id: '1',
            type: 'order',
            title: 'Nouvelle commande',
            description: 'Commande #ORD-2025-004 reçue',
            date: new Date(2025, 2, 18),
            status: 'pending'
          },
          {
            id: '2',
            type: 'delivery',
            title: 'Livraison programmée',
            description: 'Livraison de 2.5kg de champignons frais',
            date: new Date(2025, 2, 20),
            status: 'pending'
          },
          {
            id: '3',
            type: 'message',
            title: 'Nouveau message',
            description: 'Message de Jean Dupont concernant votre commande',
            date: new Date(2025, 2, 15)
          },
          {
            id: '4',
            type: 'notification',
            title: 'Mise à jour de prix',
            description: 'Les prix des champignons shiitake ont été mis à jour',
            date: new Date(2025, 2, 12)
          }
        ])
        
        setIsLoading(false)
      }, 800)
    }
    
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session, router])

  const isProfileIncomplete = !session?.user?.role || !session?.user?.phone

  // Fonction pour obtenir l'icône d'activité
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="h-6 w-6 text-blue-500" />
      case 'delivery':
        return <Truck className="h-6 w-6 text-green-500" />
      case 'message':
        return <Bell className="h-6 w-6 text-amber-500" />
      case 'notification':
        return <Info className="h-6 w-6 text-purple-500" />
      default:
        return <Info className="h-6 w-6 text-gray-500" />
    }
  }
  
  // Fonction pour obtenir la couleur du badge de statut
  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="container mx-auto p-6">
      {isProfileIncomplete && <CompleteProfileBanner />}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Bonjour, {session?.user?.name || 'Utilisateur'}
        </h1>
        <p className="text-muted-foreground">
          {isProfileIncomplete 
            ? "Complétez votre profil pour accéder à toutes les fonctionnalités"
            : `Bienvenue sur votre tableau de bord. Voici un résumé de votre activité.`
          }
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {!isLoading ? (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Commandes en attente</p>
                  <p className="text-3xl font-bold mt-1">{stats.pendingOrders}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/orders" className="text-sm text-custom-accent flex items-center">
                  Voir les commandes <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Produits disponibles</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/products" className="text-sm text-custom-accent flex items-center">
                  Voir le catalogue <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Livraisons à venir</p>
                  <p className="text-3xl font-bold mt-1">{stats.upcomingDeliveries}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <Truck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/deliveries" className="text-sm text-custom-accent flex items-center">
                  Voir les livraisons <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Revenu mensuel</p>
                  <p className="text-3xl font-bold mt-1">{stats.monthlyRevenue} CHF</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/reports" className="text-sm text-custom-accent flex items-center">
                  Voir les rapports <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </motion.div>
          </>
        ) : (
          // Skeleton loaders
          <>
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <div className="h-4 w-32 bg-foreground/10 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-foreground/10 rounded"></div>
                  </div>
                  <div className="w-12 h-12 bg-foreground/10 rounded-full"></div>
                </div>
                <div className="mt-4">
                  <div className="h-4 w-28 bg-foreground/10 rounded"></div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-foreground/10 flex justify-between items-center">
              <h2 className="font-semibold">Activités récentes</h2>
              <Link href="/activities" className="text-sm text-custom-accent hover:underline">
                Voir tout
              </Link>
            </div>
            
            <div className="divide-y divide-foreground/10">
              {!isLoading ? (
                activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{activity.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {formatDateToFrench(activity.date)}
                            </span>
                            {activity.status && (
                              <Badge variant={getStatusBadgeVariant(activity.status)}>
                                {activity.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p>Aucune activité récente</p>
                  </div>
                )
              ) : (
                // Skeleton loaders
                [...Array(4)].map((_, index) => (
                  <div key={index} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/10 flex-shrink-0"></div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <div className="h-5 w-24 bg-foreground/10 rounded"></div>
                        <div className="h-5 w-16 bg-foreground/10 rounded"></div>
                      </div>
                      <div className="h-4 w-full bg-foreground/10 rounded mt-2"></div>
                      <div className="h-4 w-2/3 bg-foreground/10 rounded mt-1"></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Liens rapides */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-foreground/10">
              <h2 className="font-semibold">Accès rapides</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-foreground/5 hover:bg-foreground/10 transition-all p-4 rounded-lg flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-custom-accentLight flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-custom-accent" />
                </div>
                <div>
                  <Link href="/cart" className="font-medium">Mon panier</Link>
                  <p className="text-xs text-muted-foreground">Gérer vos commandes en cours</p>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-foreground/5 hover:bg-foreground/10 transition-all p-4 rounded-lg flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Link href="/reservations" className="font-medium">Mes réservations</Link>
                  <p className="text-xs text-muted-foreground">Visualiser vos créneaux de livraison</p>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-foreground/5 hover:bg-foreground/10 transition-all p-4 rounded-lg flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Link href="/profile" className="font-medium">Mon profil</Link>
                  <p className="text-xs text-muted-foreground">Gérer vos informations personnelles</p>
                </div>
              </motion.div>
              
              {/* Si l'utilisateur est un producteur */}
              {session?.user?.role === 'PRODUCER' && (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-foreground/5 hover:bg-foreground/10 transition-all p-4 rounded-lg flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <Link href="/producer" className="font-medium">Espace producteur</Link>
                    <p className="text-xs text-muted-foreground">Gérer vos produits et stocks</p>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Mini calendar ou prochain événement */}
            <div className="px-6 py-4 border-t border-foreground/10">
              <h3 className="font-medium text-sm mb-3">Prochaine livraison</h3>
              <div className="bg-foreground/5 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">20 Mars 2025</span>
                  <Badge variant="success" className="text-xs">Confirmée</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Livraison de 2.5kg de champignons frais prévue
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}