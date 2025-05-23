// app/api/orders/[id]/producer-details/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id

    // Vérifier si la commande existe et appartient à l'utilisateur
    const order = await prisma.order.findUnique({
      where: { 
        id: orderId,
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: {
                      select: {
                        phone: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: {
                      include: {
                        user: {
                          select: {
                            phone: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return new NextResponse("Commande non trouvée", { status: 404 })
    }

    // Vérifier si la commande est en mode "pickup" (retrait sur place)
    let deliveryType = "pickup"
    try {
      if (order.metadata) {
        const metadata = JSON.parse(order.metadata)
        deliveryType = metadata.deliveryType || "pickup"
      }
    } catch (error) {
      console.error("Erreur lors du parsing du metadata:", error)
    }

    if (deliveryType !== "pickup") {
      return new NextResponse("Cette commande n'est pas en retrait sur place", { status: 400 })
    }

    // Récupérer les détails du producteur
    let producer = null

    // Essayer d'abord avec les items standards
    if (order.items && order.items.length > 0) {
      producer = order.items[0].product.producer
    }
    // Si pas d'items, essayer avec les bookings
    else if (order.bookings && order.bookings.length > 0) {
      producer = order.bookings[0].deliverySlot.product.producer
    }

    if (!producer) {
      return new NextResponse("Aucun producteur trouvé pour cette commande", { status: 404 })
    }

    return NextResponse.json({
      companyName: producer.companyName || "Producteur",
      address: producer.address || "Adresse non disponible",
      phone: producer.user?.phone || "Téléphone non disponible"
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des détails du producteur:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
})