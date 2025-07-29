// app/api/client/reports/route.ts
// app/api/client/reports/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour les paramètres de rapport
const reportsQuerySchema = z.object({
  range: z.enum(['month', 'quarter', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeDetails: z.boolean().default(false)
})

// Types pour les données de rapport
interface SpendingByMonth {
  month: string
  amount: number
  ordersCount: number
}

interface SpendingByCategory {
  category: string
  amount: number
  percentage: number
  ordersCount: number
}

interface RecentOrder {
  id: string
  date: string
  items: number
  total: number
  status: string
  statusLabel: string
}

export const GET = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`Client ${session.user.id} génère ses rapports`)
    
    // Extraction et validation des paramètres
    const { searchParams } = new URL(request.url)
    
    // Conversion manuelle des paramètres avec les bons types
    const rawParams = {
      range: searchParams.get('range') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      includeDetails: searchParams.get('includeDetails') === 'true'
    }
    
    const { range, startDate, endDate, includeDetails } = validateData(reportsQuerySchema, rawParams)
    
    // Déterminer les dates de la plage
    const now = new Date()
    let calculatedStartDate = new Date()
    let calculatedEndDate = endDate ? new Date(endDate) : now
    
    if (startDate) {
      calculatedStartDate = new Date(startDate)
    } else {
      // Calcul automatique selon la plage
      switch (range) {
        case 'month':
          calculatedStartDate.setMonth(now.getMonth() - 6) // 6 derniers mois
          break
        case 'quarter':
          calculatedStartDate.setMonth(now.getMonth() - 12) // 12 derniers mois
          break
        case 'year':
          calculatedStartDate.setFullYear(now.getFullYear() - 2) // 2 dernières années
          break
      }
    }
    
    console.log(`Génération rapport période: ${calculatedStartDate.toISOString()} - ${calculatedEndDate.toISOString()}`)
    
    // Statuts des commandes considérées comme "payées"
    const validStatuses = [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.INVOICE_PAID]
    
    // 1. Dépenses par mois avec comptage des commandes
    const spendingByMonthRaw = await prisma.$queryRaw<Array<{month: Date, amount: string, orders_count: string}>>`
      SELECT 
        DATE_TRUNC('month', o."createdAt")::date as month,
        SUM(oi.price * oi.quantity) as amount,
        COUNT(DISTINCT o.id) as orders_count
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      WHERE 
        o."userId" = ${session.user.id}
        AND o.status = ANY(${validStatuses})
        AND o."createdAt" >= ${calculatedStartDate}
        AND o."createdAt" <= ${calculatedEndDate}
      GROUP BY DATE_TRUNC('month', o."createdAt")
      ORDER BY month ASC
    `
    
    // 2. Dépenses par catégorie de produit
    const spendingByCategoryRaw = await prisma.$queryRaw<Array<{category: string, amount: string, orders_count: string}>>`
      SELECT 
        p.type as category,
        SUM(oi.price * oi.quantity) as amount,
        COUNT(DISTINCT o.id) as orders_count
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE 
        o."userId" = ${session.user.id}
        AND o.status = ANY(${validStatuses})
        AND o."createdAt" >= ${calculatedStartDate}
        AND o."createdAt" <= ${calculatedEndDate}
      GROUP BY p.type
      ORDER BY amount DESC
    `
    
    // 3. Commandes récentes (plus détaillées)
    const recentOrders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: calculatedStartDate,
          lte: calculatedEndDate
        }
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        items: {
          select: {
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
                type: true
              }
            }
          }
        },
        ...(includeDetails && {
          invoice: {
            select: {
              id: true,
              status: true,
              dueDate: true,
              paidAt: true
            }
          }
        })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    // 4. Statistiques générales améliorées
    const totalStats = await prisma.order.aggregate({
      where: {
        userId: session.user.id,
        status: {
          in: validStatuses
        },
        createdAt: {
          gte: calculatedStartDate,
          lte: calculatedEndDate
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      },
      _avg: {
        total: true
      }
    })
    
    // Calculer le total des items
    const totalItems = await prisma.orderItem.aggregate({
      where: {
        order: {
          userId: session.user.id,
          status: {
            in: validStatuses
          },
          createdAt: {
            gte: calculatedStartDate,
            lte: calculatedEndDate
          }
        }
      },
      _sum: {
        quantity: true
      }
    })
    
    // Formater les dépenses par mois
    const spendingByMonth: SpendingByMonth[] = spendingByMonthRaw.map(item => ({
      month: new Date(item.month).toLocaleDateString('fr-FR', { 
        month: 'short', 
        year: range === 'year' ? 'numeric' : '2-digit' 
      }),
      amount: Math.round(parseFloat(item.amount) * 100) / 100,
      ordersCount: parseInt(item.orders_count)
    }))
    
    // Formater les dépenses par catégorie avec pourcentages
    const totalSpentByCategory = spendingByCategoryRaw.reduce((sum, item) => sum + parseFloat(item.amount), 0)
    
    const categoryLabels: Record<string, string> = {
      'FRESH': 'Champignons frais',
      'DRIED': 'Champignons séchés',
      'SUBSTRATE': 'Substrats',
      'WELLNESS': 'Bien-être'
    }
    
    const spendingByCategory: SpendingByCategory[] = spendingByCategoryRaw.map(item => {
      const amount = parseFloat(item.amount)
      return {
        category: categoryLabels[item.category] || item.category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalSpentByCategory > 0 ? Math.round((amount / totalSpentByCategory) * 100) : 0,
        ordersCount: parseInt(item.orders_count)
      }
    })
    
    // Formater les commandes récentes
    const statusLabels: Record<string, string> = {
      'PENDING': 'En attente',
      'CONFIRMED': 'Confirmée',
      'SHIPPED': 'Expédiée',
      'DELIVERED': 'Livrée',
      'CANCELLED': 'Annulée',
      'INVOICE_PENDING': 'Facture en attente',
      'INVOICE_PAID': 'Facture payée',
      'INVOICE_OVERDUE': 'Facture en retard'
    }
    
    const formattedRecentOrders: RecentOrder[] = recentOrders.map(order => ({
      id: order.id,
      date: order.createdAt.toISOString(),
      items: order.items.length,
      total: Math.round((order.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * 100) / 100,
      status: order.status,
      statusLabel: statusLabels[order.status] || order.status,
      ...(includeDetails && {
        itemsDetails: order.items.map(item => ({
          productName: item.product.name,
          productType: item.product.type,
          quantity: item.quantity,
          price: item.price
        })),
        invoiceInfo: order.invoice ? {
          id: order.invoice.id,
          status: order.invoice.status,
          dueDate: order.invoice.dueDate,
          paidAt: order.invoice.paidAt
        } : null
      })
    }))
    
    // Calculer des métriques supplémentaires
    const previousPeriodStart = new Date(calculatedStartDate)
    const periodDuration = calculatedEndDate.getTime() - calculatedStartDate.getTime()
    previousPeriodStart.setTime(calculatedStartDate.getTime() - periodDuration)
    
    const previousPeriodStats = await prisma.order.aggregate({
      where: {
        userId: session.user.id,
        status: {
          in: validStatuses
        },
        createdAt: {
          gte: previousPeriodStart,
          lt: calculatedStartDate
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    })
    
    // Calculer les évolutions
    const currentTotal = totalStats._sum.total || 0
    const previousTotal = previousPeriodStats._sum.total || 0
    const spendingEvolution = previousTotal > 0 
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
      : 0
    
    const currentOrdersCount = totalStats._count.id || 0
    const previousOrdersCount = previousPeriodStats._count.id || 0
    const ordersEvolution = previousOrdersCount > 0
      ? Math.round(((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100)
      : 0
    
    console.log(`Rapport généré: ${currentTotal}€ sur ${currentOrdersCount} commandes`)
    
    const reportData = {
      period: {
        range,
        startDate: calculatedStartDate.toISOString(),
        endDate: calculatedEndDate.toISOString(),
        includeDetails
      },
      spendingByMonth,
      spendingByCategory,
      recentOrders: formattedRecentOrders,
      totalStats: {
        totalOrders: currentOrdersCount,
        totalSpent: Math.round(currentTotal * 100) / 100,
        totalItems: totalItems._sum.quantity || 0,
        averageOrderValue: Math.round((totalStats._avg.total || 0) * 100) / 100,
        evolution: {
          spending: spendingEvolution,
          orders: ordersEvolution
        }
      },
      summary: {
        mostSpentCategory: spendingByCategory[0]?.category || 'Aucune',
        bestMonth: spendingByMonth.reduce((best, current) => 
          current.amount > (best?.amount || 0) ? current : best, spendingByMonth[0]
        ),
        totalCategories: spendingByCategory.length,
        activeMonths: spendingByMonth.filter(m => m.amount > 0).length
      }
    }
    
    return NextResponse.json(reportData)
    
  } catch (error) {
    console.error("Erreur lors de la génération des rapports client:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 10,
    window: 60 // Limité car les rapports sont coûteux
  }
})