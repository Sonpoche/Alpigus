// app/api/orders/[id]/producer-details/route.ts (correction)
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

    // Récupérer la commande avec les informations du producteur
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: {
                      select: {
                        phone: true,
                        name: true
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
                            phone: true,
                            name: true
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

    // Récupérer les informations du producteur principal
    let producer
    if (order.items.length > 0) {
      producer = order.items[0].product.producer
    } else if (order.bookings.length > 0) {
      producer = order.bookings[0].deliverySlot.product.producer
    } else {
      return new NextResponse('Aucun produit dans la commande', { status: 400 })
    }

    // Vérifier les autorisations (CLIENT qui a passé la commande OU producteur concerné OU admin)
    const isAdmin = session.user.role === 'ADMIN'
    const isOrderOwner = order.userId === session.user.id
    const isProducer = producer.userId === session.user.id

    if (!isAdmin && !isOrderOwner && !isProducer) {
      return new NextResponse('Accès interdit', { status: 403 })
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

    return NextResponse.json({
      companyName: producer.companyName || producer.user.name || "Producteur",
      address: producer.address || "Adresse non disponible",
      phone: producer.user?.phone || "Téléphone non disponible"
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des détails du producteur:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
})