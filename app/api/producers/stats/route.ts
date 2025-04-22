// app/api/producer/stats/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, UserRole, ProductType } from "@prisma/client"

export const GET = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      // Vérifier que l'utilisateur est un producteur
      if (session.user.role !== UserRole.PRODUCER && session.user.role !== UserRole.ADMIN) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || 'month'
      
      // Récupérer le producteur associé à l'utilisateur
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }
      
      // Déterminer la date de début selon la plage sélectionnée
      const now = new Date()
      let startDate = new Date()
      
      if (range === 'month') {
        // 6 derniers mois
        startDate.setMonth(now.getMonth() - 6)
      } else if (range === 'quarter') {
        // 12 derniers mois
        startDate.setMonth(now.getMonth() - 12)
      } else if (range === 'year') {
        // 2 dernières années
        startDate.setFullYear(now.getFullYear() - 2)
      }
      
      // Périodes précédentes pour comparaison
      const periodLength = (now.getTime() - startDate.getTime())
      const previousPeriodStart = new Date(startDate.getTime() - periodLength)
      const previousPeriodEnd = new Date(startDate)
      
      // Au lieu d'utiliser des requêtes SQL brutes qui peuvent causer des problèmes de types,
      // utilisons les méthodes Prisma standard

      // 1. Revenus par mois
      // Récupérer toutes les commandes de la période
      const orders = await prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          createdAt: { gte: startDate, lte: now },
          items: {
            some: {
              product: {
                producerId: producer.id
              }
            }
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  producerId: true
                }
              }
            }
          }
        }
      })

      // Regrouper les revenus par mois
      const revenueByMonthMap = new Map<string, number>()
      
      for (const order of orders) {
        const month = order.createdAt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        
        // Calculer le revenu pour les produits de ce producteur dans cette commande
        const orderRevenue = order.items.reduce((sum, item) => {
          if (item.product.producerId === producer.id) {
            return sum + (item.price * item.quantity)
          }
          return sum
        }, 0)
        
        if (revenueByMonthMap.has(month)) {
          revenueByMonthMap.set(month, revenueByMonthMap.get(month)! + orderRevenue)
        } else {
          revenueByMonthMap.set(month, orderRevenue)
        }
      }
      
      // Convertir la Map en tableau pour le format attendu
      const revenueByMonth = Array.from(revenueByMonthMap.entries()).map(([month, revenue]) => ({
        month,
        revenue
      })).sort((a, b) => {
        // Trier par date (convertir 'janv. 23' en date)
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        const aDate = new Date(`${aMonth} 20${aYear}`)
        const bDate = new Date(`${bMonth} 20${bYear}`)
        return aDate.getTime() - bDate.getTime()
      })
      
      // 2. Revenus par type de produit
      const revenueByProductTypeMap = new Map<ProductType, number>()
      
      for (const order of orders) {
        for (const item of order.items) {
          if (item.product.producerId === producer.id) {
            const productType = item.product.type
            const revenue = item.price * item.quantity
            
            if (revenueByProductTypeMap.has(productType)) {
              revenueByProductTypeMap.set(productType, revenueByProductTypeMap.get(productType)! + revenue)
            } else {
              revenueByProductTypeMap.set(productType, revenue)
            }
          }
        }
      }
      
      const revenueByProductType = Array.from(revenueByProductTypeMap.entries()).map(([type, revenue]) => ({
        type,
        revenue
      }))
      
      // 3. Top produits
      const productRevenueMap = new Map<string, { id: string, name: string, revenue: number, quantity: number }>()
      
      for (const order of orders) {
        for (const item of order.items) {
          if (item.product.producerId === producer.id) {
            const productId = item.product.id
            const productName = item.product.name
            const revenue = item.price * item.quantity
            const quantity = item.quantity
            
            if (productRevenueMap.has(productId)) {
              const current = productRevenueMap.get(productId)!
              productRevenueMap.set(productId, {
                id: productId,
                name: productName,
                revenue: current.revenue + revenue,
                quantity: current.quantity + quantity
              })
            } else {
              productRevenueMap.set(productId, {
                id: productId,
                name: productName,
                revenue,
                quantity
              })
            }
          }
        }
      }
      
      const topProducts = Array.from(productRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      // 4. Statistiques générales
      // Total des ventes pour la période
      const totalRevenue = Array.from(productRevenueMap.values()).reduce((sum, product) => sum + product.revenue, 0)
      const totalProductsSold = Array.from(productRevenueMap.values()).reduce((sum, product) => sum + product.quantity, 0)
      
      // Calculer le nombre total de commandes distinctes
      const orderIds = new Set<string>()
      for (const order of orders) {
        // Vérifier si la commande contient des produits de ce producteur
        const hasProducerProducts = order.items.some(item => item.product.producerId === producer.id)
        if (hasProducerProducts) {
          orderIds.add(order.id)
        }
      }
      const totalOrders = orderIds.size
      
      // Pour la période précédente, utilisons les mêmes méthodes
      const previousOrders = await prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
          items: {
            some: {
              product: {
                producerId: producer.id
              }
            }
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  producerId: true
                }
              }
            }
          }
        }
      })
      
      // Calculer le revenu et le nombre de commandes pour la période précédente
      const previousRevenueMap = new Map<string, number>()
      const previousOrderIds = new Set<string>()
      
      for (const order of previousOrders) {
        // Vérifier si la commande contient des produits de ce producteur
        const hasProducerProducts = order.items.some(item => item.product.producerId === producer.id)
        if (hasProducerProducts) {
          previousOrderIds.add(order.id)
          
          // Calculer le revenu pour les produits de ce producteur dans cette commande
          const orderRevenue = order.items.reduce((sum, item) => {
            if (item.product.producerId === producer.id) {
              return sum + (item.price * item.quantity)
            }
            return sum
          }, 0)
          
          previousRevenueMap.set(order.id, orderRevenue)
        }
      }
      
      const previousPeriodTotalRevenue = Array.from(previousRevenueMap.values()).reduce((sum, revenue) => sum + revenue, 0)
      const previousPeriodTotalOrders = previousOrderIds.size
      
      // Calcul des pourcentages de variation
      const revenueComparison = previousPeriodTotalRevenue 
        ? Math.round(((totalRevenue - previousPeriodTotalRevenue) / previousPeriodTotalRevenue) * 100)
        : 0
      
      const ordersComparison = previousPeriodTotalOrders
        ? Math.round(((totalOrders - previousPeriodTotalOrders) / previousPeriodTotalOrders) * 100)
        : 0
      
      // Calculer le panier moyen
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      
      return NextResponse.json({
        revenueByMonth,
        revenueByProductType,
        topProducts,
        totalStats: {
          totalOrders,
          totalRevenue,
          totalProductsSold,
          averageOrderValue,
          comparedToPreviousPeriod: {
            revenue: revenueComparison,
            orders: ordersComparison
          }
        }
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error)
      return new NextResponse("Erreur serveur", { status: 500 })
    }
  },
  ["PRODUCER", "ADMIN"]
)