// app/api/admin/withdrawals/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête
const withdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(100),
  producerId: z.string().cuid().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Valeurs par défaut
const defaultParams = {
  page: 1,
  limit: 20
}

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`💰 Admin ${session.user.id} consulte les demandes de retrait`)
    
    // Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Appliquer les valeurs par défaut
    const parsedParams = {
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
      page, 
      limit, 
      status, 
      producerId, 
      minAmount, 
      maxAmount, 
      dateFrom, 
      dateTo 
    } = validateData(withdrawalsQuerySchema, parsedParams)
    
    // Construction de la requête avec filtres sécurisés
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (producerId) {
      // Vérifier que le producteur existe
      const producer = await prisma.producer.findUnique({
        where: { id: producerId },
        select: { id: true }
      })
      
      if (!producer) {
        throw createError.notFound('Producteur non trouvé')
      }
      
      where.wallet = {
        producerId: producerId
      }
    }
    
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {}
      if (minAmount !== undefined) where.amount.gte = minAmount
      if (maxAmount !== undefined) where.amount.lte = maxAmount
    }
    
    if (dateFrom || dateTo) {
      where.requestedAt = {}
      if (dateFrom) where.requestedAt.gte = new Date(dateFrom)
      if (dateTo) where.requestedAt.lte = new Date(dateTo)
    }
    
    // Calcul des statistiques rapides
    const [withdrawals, total, stats] = await Promise.all([
      // Récupérer les retraits avec pagination
      prisma.withdrawal.findMany({
        where,
        include: {
          wallet: {
            include: {
              producer: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      
      // Compter le total
      prisma.withdrawal.count({ where }),
      
      // Statistiques générales
      prisma.withdrawal.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { amount: true }
      })
    ])
    
    // Calculer des métriques utiles
    const totalAmount = stats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0)
    const pendingCount = stats.find(s => s.status === 'PENDING')?._count.id || 0
    const pendingAmount = stats.find(s => s.status === 'PENDING')?._sum.amount || 0
    
    console.log(`💰 ${withdrawals.length} retraits récupérés, ${pendingCount} en attente`)
    
    // Enrichir les données pour l'affichage admin
    const enrichedWithdrawals = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt,
      // Note: adminNote pourrait ne pas exister dans le modèle, à vérifier
      // adminNote: withdrawal.adminNote,
      producer: {
        id: withdrawal.wallet.producer.id,
        companyName: withdrawal.wallet.producer.companyName,
        user: {
          name: withdrawal.wallet.producer.user.name,
          email: withdrawal.wallet.producer.user.email,
          phone: withdrawal.wallet.producer.user.phone
        }
      },
      wallet: {
        id: withdrawal.wallet.id,
        balance: withdrawal.wallet.balance,
        totalEarned: withdrawal.wallet.totalEarned
      },
      // Informations bancaires (si disponibles et nécessaires)
      bankInfo: withdrawal.status === 'PENDING' ? {
        hasIban: !!withdrawal.wallet.producer.iban,
        hasBankName: !!withdrawal.wallet.producer.bankName,
        hasAccountName: !!withdrawal.wallet.producer.bankAccountName
      } : undefined
    }))
    
    const response = {
      withdrawals: enrichedWithdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalAmount,
        pendingCount,
        pendingAmount,
        byStatus: stats.map(stat => ({
          status: stat.status,
          count: stat._count.id,
          totalAmount: stat._sum.amount || 0
        }))
      },
      filters: {
        status: status || null,
        producerId: producerId || null,
        minAmount: minAmount || null,
        maxAmount: maxAmount || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur récupération retraits:", error)
    throw error
  }
})