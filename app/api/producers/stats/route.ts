// app/api/producer/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { OrderStatus, ProductType } from "@prisma/client"

// Schéma de validation pour les paramètres de requête
const statsQuerySchema = z.object({
  range: z.enum(['month', 'quarter', 'year']).default('month')
})

// Types pour une meilleure lisibilité
interface OrderItem {
  price: number
  quantity: number
  product: {
    id: string
    name: string
    type: ProductType
    producerId: string
  }
}

interface OrderWithItems {
  id: string
  createdAt: Date
  items: OrderItem[]
}

interface RevenueByMonth {
  month: string
  revenue: number
}

interface RevenueByProductType {
  type: ProductType
  revenue: number
}

interface TopProduct {
  id: string
  name: string
  revenue: number
  quantity: number
}

interface StatsResponse {
  revenueByMonth: RevenueByMonth[]
  revenueByProductType: RevenueByProductType[]
  topProducts: TopProduct[]
  totalStats: {
    totalOrders: number
    totalRevenue: number
    totalProductsSold: number
    averageOrderValue: number
    comparedToPreviousPeriod: {
      revenue: number
      orders: number
    }
  }
}

// GET - Obtenir les statistiques du producteur
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      range: searchParams.get('range')
    }

    const { range } = validateData(statsQuerySchema, queryParams)

    console.log(`📊 Récupération statistiques par ${session.user.role} ${session.user.id} (range: ${range})`)

    // 2. Récupération sécurisée du producteur
    let producerId: string

    if (session.user.role === 'ADMIN') {
      // Admin peut spécifier un producteur via query param
      const adminProducerId = searchParams.get('producerId')
      if (!adminProducerId) {
        throw createError.validation("ID producteur requis pour les admins")
      }
      
      // Vérifier que le producteur existe
      const producer = await prisma.producer.findUnique({
        where: { id: adminProducerId },
        select: { id: true, companyName: true }
      })
      
      if (!producer) {
        throw createError.notFound("Producteur non trouvé")
      }
      
      producerId = adminProducerId
      console.log(`🔍 Admin consulte stats du producteur ${producer.companyName}`)
    } else {
      // Producteur consulte ses propres stats
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })
      
      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }
      
      producerId = producer.id
      console.log(`🏭 Producteur ${producer.companyName} consulte ses stats`)
    }

    // 3. Calcul des périodes temporelles
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case 'month':
        startDate.setMonth(now.getMonth() - 6) // 6 derniers mois
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 12) // 12 derniers mois
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 2) // 2 dernières années
        break
    }
    
    // Périodes précédentes pour comparaison
    const periodLength = now.getTime() - startDate.getTime()
    const previousPeriodStart = new Date(startDate.getTime() - periodLength)
    const previousPeriodEnd = new Date(startDate)

    // 4. Récupération sécurisée des commandes
    const orders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        createdAt: { gte: startDate, lte: now },
        items: {
          some: {
            product: {
              producerId: producerId
            }
          }
        }
      },
      select: {
        id: true,
        createdAt: true,
        items: {
          select: {
            price: true,
            quantity: true,
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

    // 5. Traitement des données - Revenus par mois
    const revenueByMonthMap = new Map<string, number>()
    
    for (const order of orders) {
      const month = order.createdAt.toLocaleDateString('fr-FR', { 
        month: 'short', 
        year: '2-digit' 
      })
      
      // Calculer le revenu pour les produits de ce producteur dans cette commande
      const orderRevenue = order.items.reduce((sum, item) => {
        if (item.product.producerId === producerId) {
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
    
    // Convertir en tableau trié
    const revenueByMonth: RevenueByMonth[] = Array.from(revenueByMonthMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => {
        // Trier par date
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        const aDate = new Date(`${aMonth} 20${aYear}`)
        const bDate = new Date(`${bMonth} 20${bYear}`)
        return aDate.getTime() - bDate.getTime()
      })

    // 6. Revenus par type de produit
    const revenueByProductTypeMap = new Map<ProductType, number>()
    
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product.producerId === producerId) {
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
    
    const revenueByProductType: RevenueByProductType[] = Array.from(revenueByProductTypeMap.entries())
      .map(([type, revenue]) => ({ type, revenue }))

    // 7. Top produits
    const productRevenueMap = new Map<string, TopProduct>()
    
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product.producerId === producerId) {
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
    
    const topProducts: TopProduct[] = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // 8. Statistiques générales
    const totalRevenue = Array.from(productRevenueMap.values())
      .reduce((sum, product) => sum + product.revenue, 0)
    const totalProductsSold = Array.from(productRevenueMap.values())
      .reduce((sum, product) => sum + product.quantity, 0)
    
    // Calculer le nombre total de commandes distinctes
    const orderIds = new Set<string>()
    for (const order of orders) {
      const hasProducerProducts = order.items.some(item => item.product.producerId === producerId)
      if (hasProducerProducts) {
        orderIds.add(order.id)
      }
    }
    const totalOrders = orderIds.size

    // 9. Statistiques de la période précédente pour comparaison
    const previousOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
        items: {
          some: {
            product: {
              producerId: producerId
            }
          }
        }
      },
      select: {
        id: true,
        createdAt: true,
        items: {
          select: {
            price: true,
            quantity: true,
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
    
    // Calculer les totaux pour la période précédente
    const previousRevenueMap = new Map<string, number>()
    const previousOrderIds = new Set<string>()
    
    for (const order of previousOrders) {
      const hasProducerProducts = order.items.some(item => item.product.producerId === producerId)
      if (hasProducerProducts) {
        previousOrderIds.add(order.id)
        
        const orderRevenue = order.items.reduce((sum, item) => {
          if (item.product.producerId === producerId) {
            return sum + (item.price * item.quantity)
          }
          return sum
        }, 0)
        
        previousRevenueMap.set(order.id, orderRevenue)
      }
    }
    
    const previousPeriodTotalRevenue = Array.from(previousRevenueMap.values())
      .reduce((sum, revenue) => sum + revenue, 0)
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

    // 10. Log d'audit sécurisé
    console.log(`📋 Audit - Statistiques consultées:`, {
      producerId,
      consultedBy: session.user.id,
      role: session.user.role,
      range,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Arrondi pour les logs
      totalOrders,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Statistiques récupérées pour producteur ${producerId}`)

    // 11. Réponse sécurisée
    const response: StatsResponse = {
      revenueByMonth,
      revenueByProductType,
      topProducts,
      totalStats: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Arrondir à 2 décimales
        totalProductsSold,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        comparedToPreviousPeriod: {
          revenue: revenueComparison,
          orders: ordersComparison
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération statistiques:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'], // Producteurs et admins
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 50, // 50 consultations par minute (données intensives)
    window: 60
  }
})