// app/api/admin/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Paramètres de filtrage
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'month'
    const status = searchParams.get('status')
    const producerId = searchParams.get('producerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Déterminer la date de début selon la plage
    const now = new Date()
    let startDate = new Date()
    
    if (range === 'week') {
      // Derniers 7 jours
      startDate.setDate(now.getDate() - 7)
    } else if (range === 'month') {
      // Dernier mois (30 jours)
      startDate.setDate(now.getDate() - 30)
    } else if (range === 'year') {
      // Dernière année
      startDate.setFullYear(now.getFullYear() - 1)
    } else if (range === 'all') {
      // Toutes les transactions
      startDate = new Date(0) // 1970-01-01
    }
    
    // Construire la requête
    const where: any = {
      createdAt: {
        gte: startDate
      }
    }
    
    // Filtrer par statut si spécifié
    if (status) {
      where.status = status
    }
    
    // Filtrer par producteur si spécifié
    if (producerId) {
      where.wallet = {
        producer: {
          id: producerId
        }
      }
    }
    
    // Récupérer les transactions avec pagination
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        include: {
          wallet: {
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
      prisma.walletTransaction.count({ where })
    ])
    
    // Calculer les statistiques
    const stats = {
      totalAmount: await prisma.walletTransaction.aggregate({
        where,
        _sum: { amount: true }
      }),
      transactionCount: total,
      completedCount: await prisma.walletTransaction.count({
        where: {
          ...where,
          status: 'COMPLETED'
        }
      }),
      pendingCount: await prisma.walletTransaction.count({
        where: {
          ...where,
          status: 'PENDING'
        }
      }),
      cancelledCount: await prisma.walletTransaction.count({
        where: {
          ...where,
          status: 'CANCELLED'
        }
      })
    }
    
    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      },
      stats
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des transactions:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["ADMIN"])