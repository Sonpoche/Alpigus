// app/api/client/reports/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, UserRole } from "@prisma/client"

export const GET = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      // Vérifier que l'utilisateur est un client
      if (session.user.role !== UserRole.CLIENT && session.user.role !== UserRole.ADMIN) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || 'month'
      
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
      
      // 1. Dépenses par mois
      const spendingByMonthData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', o."createdAt")::date as month,
          SUM(oi.price * oi.quantity) as amount
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE 
          o."userId" = ${session.user.id}
          AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY DATE_TRUNC('month', o."createdAt")
        ORDER BY month ASC
      `
      
      // 2. Dépenses par catégorie de produit
      const spendingByCategoryData = await prisma.$queryRaw`
        SELECT 
          p.type as category,
          SUM(oi.price * oi.quantity) as amount
        FROM "Order" o
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON oi."productId" = p.id
        WHERE 
          o."userId" = ${session.user.id}
          AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY p.type
      `
      
      // 3. Commandes récentes
      const recentOrders = await prisma.order.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          items: {
            select: {
              quantity: true,
              price: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })
      
      // 4. Statistiques générales
      // Total des dépenses
      const totalSpent = await prisma.orderItem.aggregate({
        _sum: {
          price: true,
          quantity: true
        },
        where: {
          order: {
            userId: session.user.id,
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
      
      // Nombre total de commandes
      const totalOrders = await prisma.order.count({
        where: {
          userId: session.user.id,
          status: {
            in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
          },
          createdAt: {
            gte: startDate,
            lte: now
          }
        }
      })
      
      // Formater les dépenses par mois
      const formattedSpendingByMonth = (spendingByMonthData as any[]).map(item => ({
        month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        amount: parseFloat(item.amount)
      }))
      
      // Formater les dépenses par catégorie
      const categoryLabels = {
        'FRESH': 'Champignons frais',
        'DRIED': 'Champignons séchés',
        'SUBSTRATE': 'Substrats',
        'WELLNESS': 'Bien-être'
      }
      
      const formattedSpendingByCategory = (spendingByCategoryData as any[]).map(item => ({
        category: categoryLabels[item.category as keyof typeof categoryLabels] || item.category,
        amount: parseFloat(item.amount)
      }))
      
      // Formater les commandes récentes
      const formattedRecentOrders = recentOrders.map(order => ({
        id: order.id,
        date: order.createdAt.toISOString(),
        items: order.items.length,
        total: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: order.status
      }))
      
      // Calculer le panier moyen
      const averageOrderValue = totalOrders > 0 
        ? (totalSpent._sum.price || 0) / totalOrders
        : 0
      
      return NextResponse.json({
        spendingByMonth: formattedSpendingByMonth,
        spendingByCategory: formattedSpendingByCategory,
        recentOrders: formattedRecentOrders,
        totalStats: {
          totalOrders,
          totalSpent: totalSpent._sum.price || 0,
          totalItems: totalSpent._sum.quantity || 0,
          averageOrderValue
        }
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des rapports client:", error)
      return new NextResponse("Erreur serveur", { status: 500 })
    }
  },
  ["CLIENT", "ADMIN"]
)