// app/api/orders/producer/pending-count/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { UserRole, OrderStatus } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return new NextResponse("Non authentifié", { status: 401 })
    }

    if (session.user.role !== UserRole.PRODUCER) {
      return new NextResponse("Accès refusé - Producteur requis", { status: 403 })
    }

    // Récupérer l'ID du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    // Compter les commandes en attente (PENDING et CONFIRMED) pour ce producteur
    const pendingOrdersCount = await prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.CONFIRMED]
        },
        OR: [
          // Commandes contenant des produits du producteur
          {
            items: {
              some: {
                product: {
                  producerId: producer.id
                }
              }
            }
          },
          // Commandes contenant des réservations de créneaux de livraison du producteur
          {
            bookings: {
              some: {
                deliverySlot: {
                  product: {
                    producerId: producer.id
                  }
                }
              }
            }
          }
        ]
      }
    })

    return NextResponse.json({ 
      count: pendingOrdersCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du nombre de commandes en attente:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}