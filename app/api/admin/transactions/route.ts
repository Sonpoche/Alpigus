// app/api/admin/transactions/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const transactionsQuerySchema = z.object({
  range: z.enum(['week', 'month', 'year', 'all']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  producerId: z.string().cuid().optional(),
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(100),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Valeurs par défaut
const defaultParams = {
  range: 'month' as const,
  page: 1,
  limit: 50
}

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`💰 Admin ${session.user.id} consulte les transactions`)
    
    // Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Appliquer les valeurs par défaut
    const parsedParams = {
      range: queryParams.range || defaultParams.range,
      page: queryParams.page || defaultParams.page.toString(),
      limit: queryParams.limit || defaultParams.limit.toString(),
      status: queryParams.status,
      producerId: queryParams.producerId,
      minAmount: queryParams.minAmount,
      maxAmount: queryParams.maxAmount,
      dateFrom: queryParams.dateFrom,
      dateTo: queryParams.dateTo
    }
    
    const {
      range,
      status,
      producerId,
      page,
      limit,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo
    } = validateData(transactionsQuerySchema, parsedParams)
    
    // Déterminer la date de début selon la plage
    const now = new Date()
    let startDate = new Date()
    
    if (dateFrom) {
      startDate = new Date(dateFrom)
    } else {
      switch (range) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setDate(now.getDate() - 30)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0) // 1970-01-01
          break
      }
    }
    
    const endDate = dateTo ? new Date(dateTo) : now
    
    // Construire la requête avec filtres sécurisés
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
    
    // Filtrer par statut si spécifié
    if (status) {
      where.status = status
    }
    
    // Filtrer par producteur si spécifié
    if (producerId) {
      // Vérifier que le producteur existe
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
        select: { id: true }
      })
      
      if (!producer) {
        throw createError.notFound('Producteur non trouvé')
      }
      
      where.producerId = producerId
    }
    
    // Filtres par montant
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {}
      if (minAmount !== undefined) where.amount.gte = minAmount
      if (maxAmount !== undefined) where.amount.lte = maxAmount
    }
    
    // Récupérer les transactions avec pagination et statistiques
    const [transactions, total, stats] = await Promise.all([
      // Transactions avec pagination
      prisma.transaction.findMany({
        where,
        include: {
          producer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      
      // Nombre total de transactions
      prisma.transaction.count({ where }),
      
      // Statistiques agrégées
      prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { amount: true, fee: true }
      })
    ])
    
    // Calculer des métriques supplémentaires
    const totalAmount = stats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0)
    const totalFees = stats.reduce((sum, stat) => sum + (stat._sum.fee || 0), 0)
    const totalNet = totalAmount - totalFees
    
    // Répartition par statut
    const statusBreakdown = stats.map(stat => ({
      status: stat.status,
      count: stat._count.id,
      totalAmount: stat._sum.amount || 0,
      totalFees: stat._sum.fee || 0
    }))
    
    // Enrichir les transactions pour l'affichage admin
    const enrichedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      fee: transaction.fee,
      netAmount: transaction.amount - (transaction.fee || 0),
      status: transaction.status,
      createdAt: transaction.createdAt,
      producer: transaction.producer ? {
        id: transaction.producer.id,
        companyName: transaction.producer.companyName,
        user: {
          name: transaction.producer.user.name,
          email: transaction.producer.user.email
        }
      } : null,
      order: transaction.order ? {
        id: transaction.order.id,
        customer: {
          name: transaction.order.user.name,
          email: transaction.order.user.email
        }
      } : null,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null
    }))
    
    console.log(`💰 ${transactions.length} transactions récupérées (${Math.round(totalAmount)}€ total)`)
    
    const response = {
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalAmount,
        totalFees,
        totalNet,
        transactionCount: total,
        averageAmount: total > 0 ? totalAmount / total : 0
      },
      breakdown: {
        byStatus: statusBreakdown
      },
      filters: {
        range,
        status: status || null,
        producerId: producerId || null,
        minAmount: minAmount || null,
        maxAmount: maxAmount || null,
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString()
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur récupération transactions:", error)
    throw error
  }
})