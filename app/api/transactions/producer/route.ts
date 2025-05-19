// app/api/transactions/producer/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Récupérer le producteur associé à l'utilisateur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true }
    })

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    if (!producer.wallet) {
      return new NextResponse("Portefeuille non configuré", { status: 404 })
    }

    // Paramètres de filtrage
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'month'
    
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
    }
    
    // Récupérer les transactions du portefeuille
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: producer.wallet.id,
        createdAt: {
          gte: startDate
        }
      },
      include: {
        order: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Erreur lors de la récupération des transactions:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["PRODUCER"])