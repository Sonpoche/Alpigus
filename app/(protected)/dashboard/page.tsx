// app/(protected)/dashboard/page.tsx - VERSION COMPLÈTE CORRIGÉE POUR ÉVITER LES ERREURS 403 ADMIN
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
 Info,
 Edit,
 Plus,
 AlertTriangle
} from "lucide-react"
import { CompleteProfileBanner } from '@/components/profile/complete-profile-banner'
import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { formatDateToFrench } from "@/lib/date-utils"
import { useToast } from "@/hooks/use-toast"
import { UserRole, OrderStatus, ProductType } from '@prisma/client'
import { containerClasses, gridClasses, cardClasses, spacingClasses } from '@/lib/utils'

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
 link?: string
}

// Composant pour les cartes d'activité responsive
function ActivityCard({ 
 activity, 
 getActivityIcon, 
 getStatusBadgeVariant, 
 getStatusTranslation 
}: {
 activity: RecentActivity
 getActivityIcon: (type: string) => React.ReactNode
 getStatusBadgeVariant: (status?: string) => string
 getStatusTranslation: (status?: string) => string
}) {
 return (
   <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-foreground/5 transition-colors">
     {/* Icône */}
     <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
       <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
         {getActivityIcon(activity.type)}
       </div>
       
       {/* Contenu principal */}
       <div className="flex-1 min-w-0">
         {/* En-tête avec titre et badge */}
         <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
           <div className="min-w-0 flex-1">
             {activity.link ? (
               <Link 
                 href={activity.link} 
                 className="font-medium text-sm sm:text-base hover:text-custom-accent transition-colors line-clamp-2"
               >
                 {activity.title}
               </Link>
             ) : (
               <h3 className="font-medium text-sm sm:text-base line-clamp-2">
                 {activity.title}
               </h3>
             )}
           </div>
           
           {activity.status && (
             <Badge 
               variant={getStatusBadgeVariant(activity.status) as any}
               className="text-xs whitespace-nowrap"
             >
               {getStatusTranslation(activity.status)}
             </Badge>
           )}
         </div>
         
         {/* Description */}
         <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
           {activity.description}
         </p>
         
         {/* Date et lien d'action */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
           <div className="flex items-center gap-1 text-xs text-muted-foreground">
             <Clock className="h-3 w-3 flex-shrink-0" />
             <span className="truncate">
               {formatDateToFrench(activity.date)}
             </span>
           </div>
           
           {activity.link && (
             <Link 
               href={activity.link}
               className="text-xs text-custom-accent hover:underline flex items-center gap-1 self-start sm:self-auto"
             >
               <span>Voir détails</span>
               <ArrowRight className="h-3 w-3" />
             </Link>
           )}
         </div>
       </div>
     </div>
   </div>
 )
}

export default function DashboardPage() {
 const { data: session } = useSession()
 const router = useRouter()
 const { toast } = useToast()
 const [stats, setStats] = useState<DashboardStats>({
   pendingOrders: 0,
   totalProducts: 0,
   upcomingDeliveries: 0,
   monthlyRevenue: 0
 })
 const [activities, setActivities] = useState<RecentActivity[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
 const [upcomingDeliveries, setUpcomingDeliveries] = useState<any[]>([])

 // ✅ FONCTION UTILITAIRE pour vérifier le rôle admin
 const isAdmin = (role: string | null | undefined): boolean => {
   return role === 'ADMIN'
 }

 useEffect(() => {
   // ✅ CORRECTION : Redirection immédiate pour les administrateurs SANS appel API
   if (isAdmin(session?.user?.role)) {
     router.push('/admin')
     return // ✅ IMPORTANT : Arrêter l'exécution ici
   }
   
   // ✅ CORRECTION : Ne récupérer les données que pour les non-admins
   const fetchDashboardData = async () => {
     // Double vérification pour éviter les appels API pour les admins
     if (isAdmin(session?.user?.role)) {
       return
     }
     
     setIsLoading(true)
     
     try {
       // Récupérer les statistiques selon le rôle
       if (session?.user?.role === 'PRODUCER') {
         await fetchProducerData()
       } else if (session?.user?.role === 'CLIENT') {
         await fetchClientData()
       }
       
     } catch (error) {
       console.error('Erreur lors du chargement des données:', error)
       toast({
         title: "Erreur",
         description: "Impossible de charger les données du tableau de bord",
         variant: "destructive"
       })
     } finally {
       setIsLoading(false)
     }
   }
   
   // ✅ CORRECTION : Vérifier le rôle avant d'exécuter les appels API
   if (session?.user && !isAdmin(session.user.role)) {
     fetchDashboardData()
   }
 }, [session, router, toast])

 // Récupérer les données pour un producteur - VERSION CORRIGÉE
 const fetchProducerData = async () => {
   try {
     console.log('Début fetchProducerData')
     
     // Récupérer les produits du producteur
     const productsResponse = await fetch('/api/products')
     console.log('Réponse products:', productsResponse.status)
     
     if (!productsResponse.ok) {
       throw new Error(`Erreur API products: ${productsResponse.status}`)
     }
     
     const productsData = await productsResponse.json()
     console.log('Données products brutes:', productsData)
     
     // ✅ CORRECTION: Gérer différents formats de réponse
     let products: any[] = []
     if (Array.isArray(productsData)) {
       products = productsData
     } else if (productsData && Array.isArray(productsData.products)) {
       products = productsData.products
     } else if (productsData && Array.isArray(productsData.data)) {
       products = productsData.data
     } else {
       console.warn('Format de réponse products inattendu:', productsData)
       products = []
     }
     
     // Récupérer les commandes du producteur
     let orders: any[] = []
     try {
       const ordersResponse = await fetch('/api/orders/producer')
       if (ordersResponse.ok) {
         const ordersData = await ordersResponse.json()
         console.log('Données orders brutes:', ordersData)
         
         if (Array.isArray(ordersData)) {
           orders = ordersData
         } else if (ordersData && Array.isArray(ordersData.orders)) {
           orders = ordersData.orders
         } else if (ordersData && Array.isArray(ordersData.data)) {
           orders = ordersData.data
         } else {
           orders = []
         }
       }
     } catch (ordersError) {
       console.warn('Erreur lors de la récupération des commandes producteur:', ordersError)
       orders = []
     }
     
     // Récupérer les créneaux de livraison
     let deliverySlots: any[] = []
     try {
       const deliverySlotsResponse = await fetch('/api/delivery-slots')
       if (deliverySlotsResponse.ok) {
         const deliverySlotsData = await deliverySlotsResponse.json()
         console.log('Données delivery-slots brutes:', deliverySlotsData)
         
         if (Array.isArray(deliverySlotsData)) {
           deliverySlots = deliverySlotsData
         } else if (deliverySlotsData && Array.isArray(deliverySlotsData.slots)) {
           deliverySlots = deliverySlotsData.slots
         } else if (deliverySlotsData && Array.isArray(deliverySlotsData.data)) {
           deliverySlots = deliverySlotsData.data
         } else {
           deliverySlots = []
         }
       }
     } catch (slotsError) {
       console.warn('Erreur lors de la récupération des créneaux:', slotsError)
       deliverySlots = []
     }
     
     // Calculer les statistiques
     const pendingOrdersCount = orders.filter((order: any) => 
       order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
     ).length
     
     const totalProductsCount = products.length
     
     // Filtrer les livraisons à venir (aujourd'hui ou futur)
     const now = new Date()
     const upcomingDeliveriesData = deliverySlots.filter((slot: any) => {
       try {
         const slotDate = new Date(slot.date)
         return slotDate >= now
       } catch {
         return false
       }
     })
     
     // Calculer le revenu mensuel (somme des commandes des 30 derniers jours)
     const thirtyDaysAgo = new Date()
     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
     
     const recentOrders = orders.filter((order: any) => {
       try {
         const orderDate = new Date(order.createdAt)
         return orderDate >= thirtyDaysAgo && 
           (order.status === OrderStatus.CONFIRMED || 
            order.status === OrderStatus.SHIPPED || 
            order.status === OrderStatus.DELIVERED)
       } catch {
         return false
       }
     })
     
     const monthlyRevenue = recentOrders.reduce((sum: number, order: any) => {
       const total = Number(order.total) || 0
       return sum + total
     }, 0)
     
     // Produits avec stock bas
     const lowStockProductsData = products.filter((product: any) => {
       if (!product.stock) return false
       try {
         // Considérer comme bas si < 10% du stock ou < 5 unités
         const threshold = Math.min(5, product.stock.quantity * 0.1)
         return product.stock.quantity <= threshold
       } catch {
         return false
       }
     }).slice(0, 3) // Limiter à 3 produits
     
     // Construire les activités récentes
     const recentActivities: RecentActivity[] = []
     
     // Ajouter les commandes récentes
     recentOrders.slice(0, 3).forEach((order: any) => {
       if (order.id && order.user) {
         recentActivities.push({
           id: `order-${order.id}`,
           type: 'order',
           title: `Nouvelle commande #${order.id.substring(0, 8).toUpperCase()}`,
           description: `Commande de ${order.user.name || order.user.email}`,
           date: new Date(order.createdAt || Date.now()),
           status: getOrderStatusLabel(order.status),
           link: `/producer/orders?modal=${order.id}`
         })
       }
     })
     
     // Ajouter les disponibilités produits frais
     upcomingDeliveriesData.slice(0, 3).forEach((slot: any) => {
       if (slot.id && slot.product) {
         recentActivities.push({
           id: `delivery-${slot.id}`,
           type: 'delivery',
           title: `Disponibilité produit frais`,
           description: `${slot.product.name} - ${slot.maxCapacity - slot.reserved} ${slot.product.unit} disponible`,
           date: new Date(slot.date || Date.now()),
           status: 'pending'
         })
       }
     })
     
     // Tri par date décroissante
     recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime())
     
     console.log('Statistiques producteur calculées:', {
       pendingOrdersCount,
       totalProductsCount,
       upcomingDeliveries: upcomingDeliveriesData.length,
       monthlyRevenue
     })
     
     // Mettre à jour l'état
     setStats({
       pendingOrders: pendingOrdersCount,
       totalProducts: totalProductsCount,
       upcomingDeliveries: upcomingDeliveriesData.length,
       monthlyRevenue: monthlyRevenue
     })
     
     setActivities(recentActivities)
     setLowStockProducts(lowStockProductsData)
     setUpcomingDeliveries(upcomingDeliveriesData.slice(0, 3))
     
   } catch (error) {
     console.error("Erreur lors du chargement des données producteur:", error)
     
     // En cas d'erreur, initialiser avec des valeurs par défaut
     setStats({
       pendingOrders: 0,
       totalProducts: 0,
       upcomingDeliveries: 0,
       monthlyRevenue: 0
     })
     setActivities([])
     setLowStockProducts([])
     setUpcomingDeliveries([])
     
     throw error
   }
 }

 // Récupérer les données pour un client - VERSION CORRIGÉE
 const fetchClientData = async () => {
   try {
     console.log('Début fetchClientData')
     
     // Récupérer les commandes du client
     const ordersResponse = await fetch('/api/orders')
     console.log('Réponse orders:', ordersResponse.status)
     
     if (!ordersResponse.ok) {
       throw new Error(`Erreur API orders: ${ordersResponse.status}`)
     }
     
     const ordersData = await ordersResponse.json()
     console.log('Données orders brutes:', ordersData)
     
     // ✅ CORRECTION: Gérer différents formats de réponse
     let orders: any[] = []
     
     if (Array.isArray(ordersData)) {
       // Format direct : tableau
       orders = ordersData
     } else if (ordersData && Array.isArray(ordersData.orders)) {
       // Format objet avec propriété 'orders'
       orders = ordersData.orders
     } else if (ordersData && Array.isArray(ordersData.data)) {
       // Format objet avec propriété 'data'
       orders = ordersData.data
     } else {
       // Format inconnu, initialiser un tableau vide
       console.warn('Format de réponse orders inattendu:', ordersData)
       orders = []
     }
     
     console.log('Orders après parsing:', orders.length)
     
     // Récupérer les créneaux de livraison RÉSERVÉS PAR LE CLIENT
     let deliveries: any[] = []
     try {
       const myDeliveriesResponse = await fetch('/api/delivery-slots/booked')
       if (myDeliveriesResponse.ok) {
         const deliveriesData = await myDeliveriesResponse.json()
         console.log('Données deliveries brutes:', deliveriesData)
         
         // Même logique de parsing pour les livraisons
         if (Array.isArray(deliveriesData)) {
           deliveries = deliveriesData
         } else if (deliveriesData && Array.isArray(deliveriesData.slots)) {
           deliveries = deliveriesData.slots
         } else if (deliveriesData && Array.isArray(deliveriesData.data)) {
           deliveries = deliveriesData.data
         } else {
           deliveries = []
         }
       }
     } catch (deliveryError) {
       console.warn('Erreur lors de la récupération des livraisons:', deliveryError)
       deliveries = []
     }
     
     // Récupérer les produits disponibles pour le client
     let availableProducts: any[] = []
     try {
       const productsResponse = await fetch('/api/products?available=true')
       if (productsResponse.ok) {
         const productsData = await productsResponse.json()
         console.log('Données products brutes:', productsData)
         
         // Même logique de parsing pour les produits
         if (Array.isArray(productsData)) {
           availableProducts = productsData
         } else if (productsData && Array.isArray(productsData.products)) {
           availableProducts = productsData.products
         } else if (productsData && Array.isArray(productsData.data)) {
           availableProducts = productsData.data
         } else {
           availableProducts = []
         }
       }
     } catch (productsError) {
       console.warn('Erreur lors de la récupération des produits:', productsError)
       availableProducts = []
     }
     
     // Calculer les statistiques
     const pendingOrdersCount = orders.filter((order: any) => 
       order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
     ).length
     
     // Filtrer les livraisons à venir (aujourd'hui ou futur)
     const now = new Date()
     const upcomingDeliveriesData = deliveries.filter((delivery: any) => {
       try {
         const deliveryDate = new Date(delivery.date)
         return deliveryDate >= now
       } catch {
         return false
       }
     })
     
     // Calculer le total dépensé ce mois-ci
     const firstDayOfMonth = new Date()
     firstDayOfMonth.setDate(1)
     firstDayOfMonth.setHours(0, 0, 0, 0)
     
     const ordersThisMonth = orders.filter((order: any) => {
       try {
         const orderDate = new Date(order.createdAt)
         return orderDate >= firstDayOfMonth && 
           (order.status === OrderStatus.CONFIRMED || 
            order.status === OrderStatus.SHIPPED || 
            order.status === OrderStatus.DELIVERED)
       } catch {
         return false
       }
     })
     
     const monthlySpent = ordersThisMonth.reduce((sum: number, order: any) => {
       const total = Number(order.total) || 0
       return sum + total
     }, 0)
     
     // Construire les activités récentes
     const recentActivities: RecentActivity[] = []
     
     // Ajouter les commandes récentes (maximum 3)
     orders.slice(0, 3).forEach((order: any) => {
       if (order.id && order.status) {
         recentActivities.push({
           id: `order-${order.id}`,
           type: 'order',
           title: `Commande #${order.id.substring(0, 8).toUpperCase()}`,
           description: `Statut: ${getOrderStatusTranslation(order.status)}`,
           date: new Date(order.createdAt || Date.now()),
           status: getOrderStatusLabel(order.status),
           link: `/orders?modal=${order.id}`
         })
       }
     })
     
     // Ajouter les produits frais réservés
     upcomingDeliveriesData.forEach((delivery: any) => {
       // Vérification que c'est bien une réservation du client
       if (delivery.booking && delivery.booking.userId === session?.user?.id) {
         recentActivities.push({
           id: `delivery-${delivery.id}`,
           type: 'delivery',
           title: `Produit frais réservé`,
           description: `${delivery.product?.name || 'Produit'} - ${delivery.booking.quantity} ${delivery.product?.unit || ''}`,
           date: new Date(delivery.date || Date.now()),
           status: 'pending'
         })
       }
     })
     
     // Tri par date décroissante
     recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime())
     
     console.log('Statistiques calculées:', {
       pendingOrdersCount,
       totalProducts: availableProducts.length,
       upcomingDeliveries: upcomingDeliveriesData.length,
       monthlySpent
     })
     
     // Mettre à jour l'état
     setStats({
       pendingOrders: pendingOrdersCount,
       totalProducts: availableProducts.length,
       upcomingDeliveries: upcomingDeliveriesData.length,
       monthlyRevenue: monthlySpent
     })
     
     setActivities(recentActivities)
     setUpcomingDeliveries(upcomingDeliveriesData)
     
   } catch (error) {
     console.error("Erreur lors du chargement des données client:", error)
     
     // En cas d'erreur, initialiser avec des valeurs par défaut
     setStats({
       pendingOrders: 0,
       totalProducts: 0,
       upcomingDeliveries: 0,
       monthlyRevenue: 0
     })
     setActivities([])
     setUpcomingDeliveries([])
     
     throw error // Re-lancer l'erreur pour qu'elle soit gérée par le useEffect
   }
 }

 // Obtenir le libellé du statut de commande
 const getOrderStatusLabel = (status: OrderStatus): 'pending' | 'completed' | 'cancelled' => {
   switch (status) {
     case OrderStatus.PENDING:
     case OrderStatus.CONFIRMED:
       return 'pending'
     case OrderStatus.SHIPPED:
     case OrderStatus.DELIVERED:
       return 'completed'
     case OrderStatus.CANCELLED:
       return 'cancelled'
     default:
       return 'pending'
   }
 }
 
 // Traduction des statuts de commande
 const getOrderStatusTranslation = (status: OrderStatus): string => {
   switch (status) {
     case OrderStatus.PENDING: return 'En attente'
     case OrderStatus.CONFIRMED: return 'Confirmée'
     case OrderStatus.SHIPPED: return 'Expédiée'
     case OrderStatus.DELIVERED: return 'Livrée'
     case OrderStatus.CANCELLED: return 'Annulée'
     default: return status
   }
 }

 const isProfileIncomplete = !session?.user?.role || !session?.user?.phone

 // Fonction pour obtenir l'icône d'activité
 const getActivityIcon = (type: string) => {
   switch (type) {
     case 'order':
       return <ShoppingBag className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500" />
     case 'delivery':
       return <Truck className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
     case 'message':
       return <Bell className="h-4 w-4 sm:h-6 sm:w-6 text-amber-500" />
     case 'notification':
       return <Info className="h-4 w-4 sm:h-6 sm:w-6 text-purple-500" />
     default:
       return <Info className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500" />
   }
 }
 
 // Fonction pour obtenir la couleur du badge de statut et le texte en français
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
 
 // Fonction pour traduire le statut en français
 const getStatusTranslation = (status?: string) => {
   switch (status) {
     case 'pending':
       return 'En attente'
     case 'completed':
       return 'Terminé'
     case 'cancelled':
       return 'Annulé'
     default:
       return 'En attente'
   }
 }

 // Fonction pour obtenir les éléments du dashboard selon le rôle
 const getDashboardItems = () => {
   if (session?.user?.role === 'PRODUCER') {
     return [
       {
         title: "Commandes en attente",
         value: stats.pendingOrders,
         icon: <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />,
         bgColor: "bg-blue-100 dark:bg-blue-900/20",
         link: "/producer/orders",
         linkText: "Voir les commandes"
       },
       {
         title: "Produits en ligne",
         value: stats.totalProducts,
         icon: <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />,
         bgColor: "bg-green-100 dark:bg-green-900/20",
         link: "/producer",
         linkText: "Gérer mes produits"
       },
       {
         title: "Créneaux de livraison",
         value: stats.upcomingDeliveries,
         icon: <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />,
         bgColor: "bg-amber-100 dark:bg-amber-900/20",
         link: "/producer/delivery-slots/overview",
         linkText: "Gérer les créneaux"
       },
       {
         title: "Revenu mensuel",
         value: `${stats.monthlyRevenue.toFixed(2)} CHF`,
         icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />,
         bgColor: "bg-purple-100 dark:bg-purple-900/20",
         link: "/producer/stats",
         linkText: "Voir les rapports"
       }
     ]
   } else {
     // Client
     return [
       {
         title: "Mes commandes",
         value: stats.pendingOrders,
         icon: <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />,
         bgColor: "bg-blue-100 dark:bg-blue-900/20",
         link: "/orders",
         linkText: "Voir mes commandes"
       },
       {
         title: "Produits disponibles",
         value: stats.totalProducts,
         icon: <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />,
         bgColor: "bg-green-100 dark:bg-green-900/20",
         link: "/products",
         linkText: "Voir le catalogue"
       },
       {
         title: "Livraisons à venir",
         value: stats.upcomingDeliveries,
         icon: <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />,
         bgColor: "bg-amber-100 dark:bg-amber-900/20",
         link: "/deliveries",
         linkText: "Voir mes livraisons"
       },
       {
         title: "Dépenses mensuelles",
         value: `${stats.monthlyRevenue.toFixed(2)} CHF`,
         icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />,
         bgColor: "bg-purple-100 dark:bg-purple-900/20",
         link: "/reports",
         linkText: "Voir les rapports"
       }
     ]
   }
 }
 
 // Obtenir les liens rapides selon le rôle
 const getQuickLinks = () => {
   if (session?.user?.role === 'PRODUCER') {
     return [
       {
         title: "Ajouter un produit",
         description: "Créer un nouveau produit",
         icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />,
         link: "/producer/new",
         bgColor: "bg-custom-accentLight"
       },
       {
         title: "Gérer mes livraisons",
         description: "Configurer les créneaux de livraison",
         icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />,
         link: "/producer/delivery-slots/overview",
         bgColor: "bg-blue-100 dark:bg-blue-900/20"
       },
       {
         title: "Voir les commandes",
         description: "Gérer mes commandes en cours",
         icon: <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />,
         link: "/producer/orders",
         bgColor: "bg-amber-100 dark:bg-amber-900/20"
       }
     ]
   } else {
     // Client
     return [
       {
         title: "Mon panier",
         description: "Voir mon panier d'achat",
         icon: <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />,
         link: "/cart",
         bgColor: "bg-custom-accentLight"
       },
       {
         title: "Parcourir le catalogue",
         description: "Découvrir de nouveaux produits",
         icon: <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />,
         link: "/products",
         bgColor: "bg-blue-100 dark:bg-blue-900/20"
       },
       {
         title: "Mon profil",
         description: "Gérer mes informations personnelles",
         icon: <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />,
         link: "/profile",
         bgColor: "bg-green-100 dark:bg-green-900/20"
       }
     ]
   }
 }

 // Rendu conditionnel des widgets supplémentaires selon le rôle
 const renderRoleSpecificWidgets = () => {
   if (session?.user?.role === 'PRODUCER') {
     return (
       <>
         {/* Alertes de stock bas */}
         {lowStockProducts.length > 0 && (
           <div className={cardClasses("mb-6")}>
             <div className={spacingClasses('sm')}>
               <h2 className="font-semibold text-base sm:text-lg mb-4">Alertes de stock</h2>
               <div className="space-y-3 sm:space-y-4">
                 {lowStockProducts.map(product => (
                   <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full">
                         <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                       </div>
                       <div>
                         <p className="font-medium text-sm sm:text-base">{product.name}</p>
                         <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                           Stock bas: {product.stock?.quantity || 0} {product.unit}
                         </p>
                       </div>
                     </div>
                     <Link 
                       href={`/producer/${product.id}/edit`}
                       className="flex items-center justify-center sm:justify-start gap-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
                     >
                       <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                       Ajuster
                     </Link>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         )}
       </>
     )
   }
   
   return null
 }

 // ✅ CORRECTION : Affichage de chargement pour les admins pendant la redirection
 if (isAdmin(session?.user?.role)) {
   return (
     <div className="flex justify-center items-center min-h-[400px]">
       <div className="text-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent mx-auto mb-4" />
         <p className="text-muted-foreground">Redirection vers l'administration...</p>
       </div>
     </div>
   )
 }

 if (isLoading) {
   return (
     <div className="flex justify-center items-center min-h-[400px]">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
     </div>
   )
 }

 return (
   <div className={containerClasses("py-4 sm:py-6 lg:py-8")}>
     {isProfileIncomplete && <CompleteProfileBanner />}
     
     <div className="mb-6 sm:mb-8">
       <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
         Bonjour, {session?.user?.name || 'Utilisateur'}
       </h1>
       <p className="text-sm sm:text-base text-muted-foreground">
         {isProfileIncomplete 
           ? "Complétez votre profil pour accéder à toutes les fonctionnalités"
           : `Bienvenue sur votre tableau de bord. Voici un résumé de votre activité.`
         }
       </p>
     </div>
     
     {/* Stats Cards */}
     <div className={gridClasses({ default: 1, sm: 2, lg: 4 }, "gap-4 sm:gap-6 mb-6 sm:mb-8")}>
       {getDashboardItems().map((item, index) => (
         <motion.div 
           key={index}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 * index }}
           className={cardClasses("hover:shadow-md transition-shadow")}
         >
           <div className={spacingClasses('sm')}>
             <div className="flex items-center justify-between">
               <div className="min-w-0 flex-1">
                 <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.title}</p>
                 <p className="text-lg sm:text-2xl lg:text-3xl font-bold mt-1">{item.value}</p>
               </div>
               <div className={`w-10 h-10 sm:w-12 sm:h-12 ${item.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                 {item.icon}
               </div>
             </div>
             <div className="mt-3 sm:mt-4">
               <Link href={item.link} className="text-xs sm:text-sm text-custom-accent flex items-center hover:underline">
                 {item.linkText} <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
               </Link>
             </div>
           </div>
         </motion.div>
       ))}
     </div>
     
     <div className={gridClasses({ default: 1, lg: 3 }, "gap-4 sm:gap-6 lg:gap-8")}>
       {/* Activités récentes */}
       <div className="lg:col-span-2">
         <div className={cardClasses("shadow-sm overflow-hidden")}>
           <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-foreground/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
             <h2 className="font-semibold text-base sm:text-lg">Activités récentes</h2>
             <Link href={session?.user?.role === 'PRODUCER' ? "/producer/orders" : "/orders"} className="text-xs sm:text-sm text-custom-accent hover:underline">
               Voir tout
             </Link>
           </div>
           
           <div className="divide-y divide-foreground/10">
             {activities.length > 0 ? (
               <div className="space-y-0">
                 {activities.map((activity) => (
                   <ActivityCard
                     key={activity.id}
                     activity={activity}
                     getActivityIcon={getActivityIcon}
                     getStatusBadgeVariant={getStatusBadgeVariant}
                     getStatusTranslation={getStatusTranslation}
                   />
                 ))}
               </div>
             ) : (
               <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                 <Bell className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-3" />
                 <p className="text-sm sm:text-base">Aucune activité récente</p>
               </div>
             )}
           </div>
         </div>
         
         {/* Widget spécifique au rôle */}
         <div className="mt-4 sm:mt-6">
           {renderRoleSpecificWidgets()}
         </div>
       </div>
       
       {/* Liens rapides */}
       <div className="lg:col-span-1">
         <div className={cardClasses("shadow-sm overflow-hidden")}>
           <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-foreground/10">
             <h2 className="font-semibold text-base sm:text-lg">Accès rapides</h2>
           </div>
           
           <div className="p-4 sm:p-6 grid grid-cols-1 gap-3 sm:gap-4">
             {getQuickLinks().map((link, index) => (
               <motion.div 
                 key={index}
                 whileHover={{ scale: 1.02 }}
                 className="bg-foreground/5 hover:bg-foreground/10 transition-all p-3 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-4"
               >
                 <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${link.bgColor} flex items-center justify-center flex-shrink-0`}>
                   {link.icon}
                 </div>
                 <div className="min-w-0 flex-1">
                   <Link href={link.link} className="font-medium text-sm sm:text-base hover:text-custom-accent transition-colors line-clamp-1">
                     {link.title}
                   </Link>
                   <p className="text-xs text-muted-foreground line-clamp-1">{link.description}</p>
                 </div>
               </motion.div>
             ))}
           </div>
           
           {/* Prochaine livraison */}
           {upcomingDeliveries.length > 0 && (
             <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-foreground/10">
               <h3 className="font-medium text-sm mb-3">Prochaine disponibilité</h3>
               <div className="bg-foreground/5 p-3 rounded-lg">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                   <span className="text-sm font-medium line-clamp-1">
                     {formatDateToFrench(new Date(upcomingDeliveries[0].date))}
                   </span>
                   <Badge variant="success" className="text-xs self-start sm:self-auto">Confirmée</Badge>
                 </div>
                 <p className="text-xs text-muted-foreground line-clamp-2">
                   {session?.user?.role === 'PRODUCER'
                     ? `Produit frais: ${(upcomingDeliveries[0].maxCapacity || 0) - (upcomingDeliveries[0].reserved || 0)} ${upcomingDeliveries[0].product?.unit || ''} disponible de ${upcomingDeliveries[0].product?.name || ''}`
                     : `Produit frais réservé: ${upcomingDeliveries[0].booking?.quantity || ''} ${upcomingDeliveries[0].product?.unit || ''} de ${upcomingDeliveries[0].product?.name || ''}`
                   }
                 </p>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
   </div>
 )
}