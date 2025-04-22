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

  useEffect(() => {
    // Redirection pour les administrateurs
    if (session?.user?.role === UserRole.ADMIN) {
      router.push('/admin')
    }
    
    // Récupération des données de tableau de bord selon le rôle
    const fetchDashboardData = async () => {
      setIsLoading(true)
      
      try {
        // Récupérer les statistiques selon le rôle
        if (session?.user?.role === UserRole.PRODUCER) {
          await fetchProducerData()
        } else {
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
    
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session, router, toast])

  // Récupérer les données pour un producteur
  const fetchProducerData = async () => {
    // Récupérer les produits du producteur
    const productsResponse = await fetch('/api/products')
    const productsData = await productsResponse.json()
    const products = productsData.products || []
    
    // Récupérer les commandes du producteur
    const ordersResponse = await fetch('/api/orders/producer')
    const orders = await ordersResponse.json()
    
    // Récupérer les créneaux de livraison
    const deliverySlotsResponse = await fetch('/api/delivery-slots')
    const deliverySlotsData = await deliverySlotsResponse.json()
    const deliverySlots = deliverySlotsData.slots || []
    
    // Calculer les statistiques
    const pendingOrdersCount = orders.filter((order: any) => 
      order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
    ).length
    
    const totalProductsCount = products.length
    
    // Filtrer les livraisons à venir (aujourd'hui ou futur)
    const now = new Date()
    const upcomingDeliveriesData = deliverySlots.filter((slot: any) => {
      const slotDate = new Date(slot.date)
      return slotDate >= now
    })
    
    // Calculer le revenu mensuel (somme des commandes des 30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= thirtyDaysAgo && 
        (order.status === OrderStatus.CONFIRMED || 
         order.status === OrderStatus.SHIPPED || 
         order.status === OrderStatus.DELIVERED)
    })
    
    const monthlyRevenue = recentOrders.reduce((sum: number, order: any) => sum + order.total, 0)
    
    // Produits avec stock bas
    const lowStockProductsData = products.filter((product: any) => {
      if (!product.stock) return false
      // Considérer comme bas si < 10% du stock ou < 5 unités
      const threshold = Math.min(5, product.stock.quantity * 0.1)
      return product.stock.quantity <= threshold
    }).slice(0, 3) // Limiter à 3 produits
    
    // Construire les activités récentes
    const recentActivities: RecentActivity[] = []
    
    // Ajouter les commandes récentes
    recentOrders.slice(0, 3).forEach((order: any) => {
      recentActivities.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `Nouvelle commande #${order.id.substring(0, 8).toUpperCase()}`,
        description: `Commande de ${order.user.name || order.user.email}`,
        date: new Date(order.createdAt),
        status: getOrderStatusLabel(order.status),
        link: `/producer/orders?modal=${order.id}`
      })
    })
    
    // Ajouter les disponibilités produits frais
    upcomingDeliveriesData.slice(0, 3).forEach((slot: any) => {
      recentActivities.push({
        id: `delivery-${slot.id}`,
        type: 'delivery',
        title: `Disponibilité produit frais`,
        description: `${slot.product.name} - ${slot.reserved}/${slot.maxCapacity} ${slot.product.unit}`,
        date: new Date(slot.date),
        status: 'pending'
      })
    })
    
    // Tri par date décroissante
    recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime())
    
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
  }

  // Récupérer les données pour un client
  const fetchClientData = async () => {
    try {
      // Récupérer les commandes du client
      const ordersResponse = await fetch('/api/orders')
      const orders = await ordersResponse.json()
      
      // Récupérer les créneaux de livraison réservés
      const myDeliveriesResponse = await fetch('/api/delivery-slots?booked=true')
      let deliveries = []
      if (myDeliveriesResponse.ok) {
        const deliveriesData = await myDeliveriesResponse.json()
        deliveries = deliveriesData.slots || []
      }
      
      // Récupérer les produits disponibles pour le client
      const productsResponse = await fetch('/api/products?available=true')
      const productsData = await productsResponse.json()
      const availableProducts = productsData.products || []
      
      // Calculer les statistiques
      const pendingOrdersCount = orders.filter((order: any) => 
        order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
      ).length
      
      // Filtrer les livraisons à venir (aujourd'hui ou futur)
      const now = new Date()
      const upcomingDeliveriesData = deliveries.filter((delivery: any) => {
        const deliveryDate = new Date(delivery.date)
        return deliveryDate >= now
      })
      
      // Calculer le total dépensé ce mois-ci
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      firstDayOfMonth.setHours(0, 0, 0, 0)
      
      const ordersThisMonth = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= firstDayOfMonth && 
          (order.status === OrderStatus.CONFIRMED || 
           order.status === OrderStatus.SHIPPED || 
           order.status === OrderStatus.DELIVERED)
      })
      
      const monthlySpent = ordersThisMonth.reduce((sum: number, order: any) => sum + order.total, 0)
      
      // Construire les activités récentes
      const recentActivities: RecentActivity[] = []
      
      // Ajouter les commandes récentes
      orders.slice(0, 3).forEach((order: any) => {
        recentActivities.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Commande #${order.id.substring(0, 8).toUpperCase()}`,
          description: `Statut: ${getOrderStatusTranslation(order.status)}`,
          date: new Date(order.createdAt),
          status: getOrderStatusLabel(order.status),
          link: `/orders?view=${order.id}`
        })
      })
      
      // Ajouter les produits frais réservés
      upcomingDeliveriesData.slice(0, 3).forEach((delivery: any) => {
        recentActivities.push({
          id: `delivery-${delivery.id}`,
          type: 'delivery',
          title: `Produit frais réservé`,
          description: `${delivery.product.name} - ${delivery.quantity} ${delivery.product.unit}`,
          date: new Date(delivery.date),
          status: 'pending'
        })
      })
      
      // Tri par date décroissante
      recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime())
      
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
    if (session?.user?.role === UserRole.PRODUCER) {
      return [
        {
          title: "Commandes en attente",
          value: stats.pendingOrders,
          icon: <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
          link: "/producer/orders",
          linkText: "Voir les commandes"
        },
        {
          title: "Produits en ligne",
          value: stats.totalProducts,
          icon: <Package className="h-6 w-6 text-green-600 dark:text-green-400" />,
          bgColor: "bg-green-100 dark:bg-green-900/20",
          link: "/producer",
          linkText: "Gérer mes produits"
        },
        {
          title: "Créneaux de livraison",
          value: stats.upcomingDeliveries,
          icon: <Truck className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
          bgColor: "bg-amber-100 dark:bg-amber-900/20",
          link: "/producer/delivery-slots/overview",
          linkText: "Gérer les créneaux"
        },
        {
          title: "Revenu mensuel",
          value: `${stats.monthlyRevenue.toFixed(2)} CHF`,
          icon: <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
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
          icon: <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
          link: "/orders",
          linkText: "Voir mes commandes"
        },
        {
          title: "Produits disponibles",
          value: stats.totalProducts,
          icon: <Package className="h-6 w-6 text-green-600 dark:text-green-400" />,
          bgColor: "bg-green-100 dark:bg-green-900/20",
          link: "/products",
          linkText: "Voir le catalogue"
        },
        {
          title: "Livraisons à venir",
          value: stats.upcomingDeliveries,
          icon: <Truck className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
          bgColor: "bg-amber-100 dark:bg-amber-900/20",
          link: "/deliveries",
          linkText: "Voir mes livraisons"
        },
        {
          title: "Dépenses mensuelles",
          value: `${stats.monthlyRevenue.toFixed(2)} CHF`,
          icon: <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
          bgColor: "bg-purple-100 dark:bg-purple-900/20",
          link: "/reports",
          linkText: "Voir les rapports"
        }
      ]
    }
  }
  
  // Obtenir les liens rapides selon le rôle
  const getQuickLinks = () => {
    if (session?.user?.role === UserRole.PRODUCER) {
      return [
        {
          title: "Ajouter un produit",
          description: "Créer un nouveau produit",
          icon: <Plus className="h-5 w-5 text-custom-accent" />,
          link: "/producer/new",
          bgColor: "bg-custom-accentLight"
        },
        {
          title: "Gérer mes livraisons",
          description: "Configurer les créneaux de livraison",
          icon: <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
          link: "/producer/delivery-slots/overview",
          bgColor: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
          title: "Voir les commandes",
          description: "Gérer mes commandes en cours",
          icon: <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
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
          icon: <ShoppingBag className="h-5 w-5 text-custom-accent" />,
          link: "/cart",
          bgColor: "bg-custom-accentLight"
        },
        {
          title: "Parcourir le catalogue",
          description: "Découvrir de nouveaux produits",
          icon: <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
          link: "/products",
          bgColor: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
          title: "Mon profil",
          description: "Gérer mes informations personnelles",
          icon: <Users className="h-5 w-5 text-green-600 dark:text-green-400" />,
          link: "/profile",
          bgColor: "bg-green-100 dark:bg-green-900/20"
        }
      ]
    }
  }

  // Rendu conditionnel des widgets supplémentaires selon le rôle
  const renderRoleSpecificWidgets = () => {
    if (session?.user?.role === UserRole.PRODUCER) {
      return (
        <>
          {/* Alertes de stock bas */}
          {lowStockProducts.length > 0 && (
            <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4">Alertes de stock</h2>
              <div className="space-y-4">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Stock bas: {product.stock.quantity} {product.unit}
                        </p>
                      </div>
                    </div>
                    <Link 
                      href={`/producer/${product.id}/edit`}
                      className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      <Edit className="h-4 w-4" />
                      Ajuster
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )
    }
    
    return null
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
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
        {getDashboardItems().map((item, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{item.title}</p>
                <p className="text-3xl font-bold mt-1">{item.value}</p>
              </div>
              <div className={`w-12 h-12 ${item.bgColor} rounded-full flex items-center justify-center`}>
                {item.icon}
              </div>
            </div>
            <div className="mt-4">
              <Link href={item.link} className="text-sm text-custom-accent flex items-center">
                {item.linkText} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-foreground/10 flex justify-between items-center">
              <h2 className="font-semibold">Activités récentes</h2>
              <Link href={session?.user?.role === UserRole.PRODUCER ? "/producer/orders" : "/orders"} className="text-sm text-custom-accent hover:underline">
                Voir tout
              </Link>
            </div>
            
            <div className="divide-y divide-foreground/10">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <h3 className="font-medium">
                          {activity.link ? (
                            <Link href={activity.link} className="hover:text-custom-accent">
                              {activity.title}
                            </Link>
                          ) : (
                            activity.title
                          )}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDateToFrench(activity.date)}
                          </span>
                          {activity.status && (
                            <Badge variant={getStatusBadgeVariant(activity.status)}>
                              {getStatusTranslation(activity.status)}
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
              )}
            </div>
          </div>
          
          {/* Widget spécifique au rôle */}
          <div className="mt-6">
            {renderRoleSpecificWidgets()}
          </div>
        </div>
        
        {/* Liens rapides */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-foreground/10">
              <h2 className="font-semibold">Accès rapides</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-4">
              {getQuickLinks().map((link, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className="bg-foreground/5 hover:bg-foreground/10 transition-all p-4 rounded-lg flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-full ${link.bgColor} flex items-center justify-center`}>
                    {link.icon}
                  </div>
                  <div>
                    <Link href={link.link} className="font-medium">{link.title}</Link>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Prochaine livraison */}
            {upcomingDeliveries.length > 0 && (
              <div className="px-6 py-4 border-t border-foreground/10">
                <h3 className="font-medium text-sm mb-3">Prochaine disponibilité</h3>
                <div className="bg-foreground/5 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {formatDateToFrench(new Date(upcomingDeliveries[0].date))}
                    </span>
                    <Badge variant="success" className="text-xs">Confirmée</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.role === UserRole.PRODUCER
                      ? `Produit frais: ${upcomingDeliveries[0].reserved}/${upcomingDeliveries[0].maxCapacity} ${upcomingDeliveries[0].product.unit} de ${upcomingDeliveries[0].product.name}`
                      : `Produit frais réservé: ${upcomingDeliveries[0].quantity} ${upcomingDeliveries[0].product?.unit} de ${upcomingDeliveries[0].product?.name}`
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