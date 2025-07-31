// app/api/transactions/producer/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const transactionsQuerySchema = z.object({
  range: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  limit: z.coerce.number().min(1).max(100).default(50),
  type: z.enum(['SALE', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT', 'FEE']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional()
})

// GET - Récupérer les transactions du portefeuille producteur
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      range: searchParams.get('range'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status')
    }

    const { range, type, status } = validateData(transactionsQuerySchema, queryParams)
    
    // Assurer que limit a une valeur définie (garantie par valeur par défaut Zod)
    const limit = validateData(transactionsQuerySchema, queryParams).limit!

    console.log(`💰 Récupération transactions producteur ${session.user.id} (range: ${range})`)

    // 2. Récupération sécurisée du producteur et de son portefeuille
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      include: { 
        wallet: {
          select: {
            id: true,
            balance: true,
            pendingBalance: true,
            totalEarned: true,
            totalWithdrawn: true,
            updatedAt: true
          }
        }
      }
    })

    if (!producer) {
      throw createError.notFound("Profil producteur non trouvé")
    }

    if (!producer.wallet) {
      throw createError.notFound("Portefeuille non configuré pour ce producteur")
    }

    console.log(`🏭 Producteur ${producer.companyName} consulte ses transactions`)

    // 3. Calcul des périodes temporelles
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setDate(now.getDate() - 30)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // 4. Construction des filtres sécurisés
    const whereClause: any = {
      walletId: producer.wallet.id,
      createdAt: {
        gte: startDate,
        lte: now
      }
    }

    if (type) {
      whereClause.type = type
    }

    if (status) {
      whereClause.status = status
    }

    // 5. Récupération sécurisée des transactions
    const [transactions, totalCount] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: whereClause,
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  // Email masqué pour RGPD
                  email: false
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      prisma.walletTransaction.count({
        where: whereClause
      })
    ])

    // 6. Calcul des statistiques de période
    const periodStats = {
      totalTransactions: totalCount,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      byType: {} as Record<string, { count: number, amount: number }>,
      byStatus: {} as Record<string, { count: number, amount: number }>
    }

    // Agrégation par type et statut
    transactions.forEach(transaction => {
      // Par type
      if (!periodStats.byType[transaction.type]) {
        periodStats.byType[transaction.type] = { count: 0, amount: 0 }
      }
      periodStats.byType[transaction.type].count++
      periodStats.byType[transaction.type].amount += transaction.amount

      // Par statut
      if (!periodStats.byStatus[transaction.status]) {
        periodStats.byStatus[transaction.status] = { count: 0, amount: 0 }
      }
      periodStats.byStatus[transaction.status].count++
      periodStats.byStatus[transaction.status].amount += transaction.amount
    })

    // 7. Formatage des transactions pour la réponse
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: Math.round(transaction.amount * 100) / 100, // Arrondir à 2 décimales
      status: transaction.status,
      type: transaction.type,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      order: transaction.order ? {
        id: transaction.order.id,
        status: transaction.order.status,
        createdAt: transaction.order.createdAt.toISOString(),
        customerName: transaction.order.user?.name || 'Client'
        // Email intentionnellement exclu pour RGPD
      } : null
    }))

    // 8. Log d'audit sécurisé
    console.log(`📋 Audit - Transactions consultées:`, {
      producerId: producer.id,
      consultedBy: session.user.id,
      range,
      transactionsCount: transactions.length,
      totalAmount: Math.round(periodStats.totalAmount * 100) / 100,
      filters: { type, status },
      timestamp: new Date().toISOString()
    })

    console.log(`✅ ${transactions.length} transactions récupérées sur ${totalCount}`)

    // 9. Réponse sécurisée
    const response = {
      producer: {
        id: producer.id,
        companyName: producer.companyName
      },
      wallet: {
        id: producer.wallet.id,
        balance: Math.round(producer.wallet.balance * 100) / 100,
        pendingBalance: Math.round(producer.wallet.pendingBalance * 100) / 100,
        totalEarned: Math.round(producer.wallet.totalEarned * 100) / 100,
        totalWithdrawn: Math.round(producer.wallet.totalWithdrawn * 100) / 100,
        lastUpdated: producer.wallet.updatedAt.toISOString()
      },
      transactions: formattedTransactions,
      period: {
        range,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        stats: {
          ...periodStats,
          totalAmount: Math.round(periodStats.totalAmount * 100) / 100,
          // Arrondir les montants dans les agrégations
          byType: Object.fromEntries(
            Object.entries(periodStats.byType).map(([key, value]) => [
              key,
              { ...value, amount: Math.round(value.amount * 100) / 100 }
            ])
          ),
          byStatus: Object.fromEntries(
            Object.entries(periodStats.byStatus).map(([key, value]) => [
              key,
              { ...value, amount: Math.round(value.amount * 100) / 100 }
            ])
          )
        }
      },
      pagination: {
        count: transactions.length,
        total: totalCount,
        limit,
        hasMore: totalCount > limit
      },
      meta: {
        generatedAt: new Date().toISOString(),
        currency: 'CHF',
        accessLevel: 'owner'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération transactions:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER'], // Seuls les producteurs pour leurs propres transactions
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // Consultation fréquente des finances
    window: 60
  }
})