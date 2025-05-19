// app/api/admin/withdrawals/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Construire la requête
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    // Récupérer les demandes de retrait avec pagination
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
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
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.withdrawal.count({ where })
    ])
    
    return NextResponse.json({
      withdrawals,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes de retrait:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["ADMIN"])