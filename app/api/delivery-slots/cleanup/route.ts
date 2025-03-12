// app/api/delivery-slots/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // On crée une date à J-2 (avant-hier à minuit) pour la comparaison
    const dayBeforeYesterday = new Date()
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
    dayBeforeYesterday.setHours(23, 59, 59, 999) // Fin de journée avant-hier

    const result = await prisma.deliverySlot.deleteMany({
      where: {
        date: {
          lt: dayBeforeYesterday // Supprime uniquement les créneaux antérieurs à avant-hier
        },
        ...(session.user.role === 'PRODUCER' && {
          product: {
            producer: {
              userId: session.user.id
            }
          }
        })
      }
    })

    return NextResponse.json({
      message: `${result.count} créneaux expirés supprimés`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error("Erreur lors du nettoyage des créneaux:", error)
    return new NextResponse(
      "Erreur lors du nettoyage des créneaux", 
      { status: 500 }
    )
  }
})