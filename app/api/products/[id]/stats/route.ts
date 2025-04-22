// app/api/producer/stats/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, UserRole } from "@prisma/client"

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
      
      // 1. Revenus par mois
      const salesByMonth = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', o."createdAt") as month,
          SUM(oi.price * oi.quantity) as revenue
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON oi."productId" = p.id
        WHERE 
          p."producerId" = ${producer.id}
          AND o.status IN (${OrderStatus.CONFIRMED}, ${OrderStatus.SHIPPED}, ${OrderStatus.DELIVERED})
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY DATE_TRUNC('month', o."createdAt")
        ORDER BY month ASC
      `
      
      // 2. Revenus par type de produit
      const revenueByProductType = await prisma.$queryRaw`
        SELECT 
          p.type as type,
          SUM(oi.price * oi.quantity) as revenue
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON oi."productId" = p.id
        WHERE 
          p."producerId" = ${producer.id}
          AND o.status IN (${OrderStatus.CONFIRMED}, ${OrderStatus.SHIPPED}, ${OrderStatus.DELIVERED})
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY p.type
      `
      
      // 3. Top produits
      const topProducts = await prisma.$queryRaw`
        SELECT 
          p.id,
          p.name,
          SUM(oi.quantity) as quantity,
          SUM(oi.price * oi.quantity) as revenue
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON oi."productId" = p.id
        WHERE 
          p."producerId" = ${producer.id}
          AND o.status IN (${OrderStatus.CONFIRMED}, ${OrderStatus.SHIPPED}, ${OrderStatus.DELIVERED})
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 5
      `
      
      // 4. Statistiques générales
      // Total des ventes pour la période
      const totalRevenue = await prisma.orderItem.aggregate({
        _sum: {
          price: true,
          quantity: true
        },
        where: {
          product: {
            producerId: producer.id
          },
          order: {
            status: {
              in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
            },
            createdAt: {
              gte: startDate,
              lte: now
            }
          }
        }
      })
      
      // Total commandes pour la période
      const totalOrders = await prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
          },
          createdAt: {
            gte: startDate,
            lte: now
          },
          items: {
            some: {
              product: {
                producerId: producer.id
              }
            }
          }
        },
        distinct: ['id']
      })
      
      // Total ventes période précédente
      const previousPeriodRevenue = await prisma.orderItem.aggregate({
        _sum: {
          price: true
        },
        where: {
          product: {
            producerId: producer.id
          },
          order: {
            status: {
              in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
            },
            createdAt: {
              gte: previousPeriodStart,
              lte: previousPeriodEnd
            }
          }
        }
      })
      
      // Total commandes période précédente
      const previousPeriodOrders = await prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
          },
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          },
          items: {
            some: {
              product: {
                producerId: producer.id
              }
            }
          }
        },
        distinct: ['id']
      })
      
      // Calcul des pourcentages de variation
      const revenueComparison = previousPeriodRevenue._sum.price 
        ? Math.round((((totalRevenue._sum.price || 0) - previousPeriodRevenue._sum.price) / previousPeriodRevenue._sum.price) * 100)
        : 0
      
      const ordersComparison = previousPeriodOrders
        ? Math.round(((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100)
        : 0
      
      // Formatter les revenus par mois pour le graphique
      const revenueByMonth = salesByMonth.map((item: any) => ({
        month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenue: parseFloat(item.revenue)
      }))
      
      // Calculer le panier moyen
      const averageOrderValue = totalOrders > 0 
        ? (totalRevenue._sum.price || 0) / totalOrders
        : 0
      
      return NextResponse.json({
        revenueByMonth,
        revenueByProductType,
        topProducts,
        totalStats: {
          totalOrders,
          totalRevenue: totalRevenue._sum.price || 0,
          totalProductsSold: totalRevenue._sum.quantity || 0,
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