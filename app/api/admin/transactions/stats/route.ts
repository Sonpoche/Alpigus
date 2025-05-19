// app/api/admin/transactions/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Récupérer les statistiques générales
    const totalTransactions = await prisma.transaction.count()
    
    const totalAmount = await prisma.transaction.aggregate({
      _sum: { amount: true }
    })
    
    const totalFees = await prisma.transaction.aggregate({
      _sum: { fee: true }
    })
    
    // Statistiques par statut
    const statusStats = await prisma.$queryRaw`
      SELECT 
        status, 
        COUNT(*) as count, 
        SUM(amount) as totalAmount,
        SUM(fee) as totalFees
      FROM "Transaction"
      GROUP BY status
    `
    
    // Statistiques par mois (12 derniers mois)
    const today = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") AS month,
        COUNT(*) as count,
        SUM(amount) as totalAmount,
        SUM(fee) as totalFees
      FROM "Transaction"
      WHERE "createdAt" >= ${oneYearAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `
    
    // Calcul des totaux nets
    const totalNet = (totalAmount._sum.amount || 0) - (totalFees._sum.fee || 0)
    
    // Top 5 des producteurs par volume
    const topProducers = await prisma.transaction.groupBy({
      by: ['producerId'],
      _sum: {
        amount: true,
        fee: true
      },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 5
    })
    
    // Enrichir les données des producteurs
    const producerDetails = await Promise.all(
      topProducers.map(async (producer) => {
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
        
        return {
          ...producer,
          details
        }
      })
    )
    
    return NextResponse.json({
      general: {
        totalTransactions,
        totalAmount: totalAmount._sum.amount || 0,
        totalFees: totalFees._sum.fee || 0,
        totalNet
      },
      statusStats,
      monthlyStats,
      topProducers: producerDetails
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["ADMIN"])