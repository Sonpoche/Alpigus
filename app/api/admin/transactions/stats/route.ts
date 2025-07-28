// app/api/admin/transactions/stats/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAdminSecurity } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"

export const GET = withAdminSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    console.log(`📊 Admin ${session.user.id} consulte les statistiques des transactions`)
    
    // Période d'analyse (12 derniers mois par défaut)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    // Récupérer les statistiques générales en parallèle
    const [
      totalTransactions,
      totalAmount,
      totalFees,
      statusStats,
      monthlyStats,
      topProducersRaw
    ] = await Promise.all([
      // Total des transactions
      prisma.transaction.count(),
      
      // Montant total
      prisma.transaction.aggregate({
        _sum: { amount: true }
      }),
      
      // Frais totaux
      prisma.transaction.aggregate({
        _sum: { fee: true }
      }),
      
      // Statistiques par statut
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true, fee: true }
      }),
      
      // Statistiques mensuelles (requête SQL raw pour plus d'efficacité)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") AS month,
          COUNT(*)::int as count,
          SUM(amount)::float as "totalAmount",
          SUM(fee)::float as "totalFees"
        FROM "Transaction"
        WHERE "createdAt" >= ${oneYearAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      
      // Top 5 des producteurs par volume  
      prisma.$queryRaw`
        SELECT 
          "producerId",
          COUNT(*)::int as count,
          SUM(amount)::float as "totalAmount",
          SUM(fee)::float as "totalFees"
        FROM "Transaction"
        WHERE "producerId" IS NOT NULL
        GROUP BY "producerId"
        ORDER BY "totalAmount" DESC
        LIMIT 5
      `
    ])
    
    // Calculer les totaux nets
    const totalNet = (totalAmount._sum.amount || 0) - (totalFees._sum.fee || 0)
    
    // Enrichir les données des top producteurs
    const topProducers = await Promise.all(
      (topProducersRaw as any[])
        .filter(producer => producer.producerId)
        .map(async (producer) => {
          const details = await prisma.producer.findUnique({
            where: { id: producer.producerId },
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          })
          
          if (!details) return null
          
          return {
            id: producer.producerId,
            companyName: details.companyName,
            user: {
              name: details.user.name,
              email: details.user.email
            },
            transactions: {
              count: producer.count || 0,
              totalAmount: producer.totalAmount || 0,
              totalFees: producer.totalFees || 0,
              netAmount: (producer.totalAmount || 0) - (producer.totalFees || 0)
            }
          }
        })
    )
    
    // Filtrer les producteurs valides
    const validTopProducers = topProducers.filter(Boolean)
    
    // Calculer des métriques avancées
    const avgTransactionValue = totalTransactions > 0 
      ? (totalAmount._sum.amount || 0) / totalTransactions 
      : 0
    
    const avgFeePercentage = (totalAmount._sum.amount || 0) > 0 
      ? ((totalFees._sum.fee || 0) / (totalAmount._sum.amount || 0)) * 100 
      : 0
    
    // Analyse des tendances (comparaison avec le mois précédent)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const [currentMonthStats, previousMonthStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: lastMonth
          }
        },
        _count: { id: true },
        _sum: { amount: true, fee: true }
      }),
      
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1),
            lt: lastMonth
          }
        },
        _count: { id: true },
        _sum: { amount: true, fee: true }
      })
    ])
    
    // Calculer les variations
    const volumeGrowth = previousMonthStats._sum.amount 
      ? (((currentMonthStats._sum.amount || 0) - (previousMonthStats._sum.amount || 0)) / (previousMonthStats._sum.amount || 0)) * 100
      : 0
    
    const transactionGrowth = previousMonthStats._count.id 
      ? (((currentMonthStats._count.id || 0) - (previousMonthStats._count.id || 0)) / (previousMonthStats._count.id || 0)) * 100
      : 0
    
    // Formater les statistiques mensuelles
    const formattedMonthlyStats = (monthlyStats as any[]).map(stat => ({
      month: stat.month,
      count: stat.count,
      totalAmount: stat.totalAmount || 0,
      totalFees: stat.totalFees || 0,
      netAmount: (stat.totalAmount || 0) - (stat.totalFees || 0)
    }))
    
    console.log(`📊 Statistiques calculées: ${totalTransactions} transactions, ${Math.round(totalAmount._sum.amount || 0)}€ total`)
    
    const response = {
      general: {
        totalTransactions,
        totalAmount: totalAmount._sum.amount || 0,
        totalFees: totalFees._sum.fee || 0,
        totalNet,
        avgTransactionValue,
        avgFeePercentage
      },
      growth: {
        volumeGrowth: Math.round(volumeGrowth * 100) / 100,
        transactionGrowth: Math.round(transactionGrowth * 100) / 100,
        currentMonth: {
          transactions: currentMonthStats._count.id,
          volume: currentMonthStats._sum.amount || 0,
          fees: currentMonthStats._sum.fee || 0
        },
        previousMonth: {
          transactions: previousMonthStats._count.id,
          volume: previousMonthStats._sum.amount || 0,
          fees: previousMonthStats._sum.fee || 0
        }
      },
      statusStats: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
        totalAmount: stat._sum.amount || 0,
        totalFees: stat._sum.fee || 0,
        percentage: totalTransactions > 0 ? (stat._count.id / totalTransactions) * 100 : 0
      })),
      monthlyStats: formattedMonthlyStats,
      topProducers: validTopProducers,
      generatedAt: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ Erreur récupération statistiques transactions:", error)
    throw error
  }
})