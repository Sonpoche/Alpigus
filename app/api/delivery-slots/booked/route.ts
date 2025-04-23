// app/api/delivery-slots/booked/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Récupérer uniquement les créneaux réservés par l'utilisateur courant
    const bookings = await prisma.booking.findMany({
      where: {
        order: {
          userId: session.user.id
        }
      },
      include: {
        deliverySlot: {
          include: {
            product: true
          }
        },
        order: true
      }
    })
    
    // Transformer les données pour avoir un format cohérent
    const slots = bookings.map(booking => ({
      ...booking.deliverySlot,
      booking: {
        id: booking.id,
        quantity: booking.quantity,
        price: booking.price,
        userId: booking.order.userId
      }
    }))
    
    return NextResponse.json({ slots })
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux réservés:", error)
    return new NextResponse(
      "Erreur lors de la récupération des créneaux réservés", 
      { status: 500 }
    )
  }
})