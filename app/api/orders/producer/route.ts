// app/api/orders/producer/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, UserRole } from "@prisma/client"

export const GET = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    // Vérifier que l'utilisateur est bien un producteur
    if (session.user.role !== UserRole.PRODUCER) {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') as OrderStatus | null
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    // Récupérer l'ID du producteur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    const producerId = producer.id

    // Construire la requête de base
    const baseWhere: any = {}

    // Ajouter le filtre de statut s'il est spécifié
    if (statusParam) {
      baseWhere.status = statusParam
    } else {
      // Par défaut, montrer seulement les commandes validées (exclure DRAFT et PENDING)
      baseWhere.status = {
        notIn: [OrderStatus.DRAFT, OrderStatus.PENDING]
      }
    }

    // Trouver les commandes qui contiennent des produits de ce producteur
    const ordersWithProducerItems = await prisma.order.findMany({
      where: {
        OR: [
          // Commandes contenant des articles standard du producteur
          {
            items: {
              some: {
                product: {
                  producerId: producerId
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
                    producerId: producerId
                  }
                }
              }
            }
          }
        ],
        ...baseWhere
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        },
        items: {
          include: {
            product: {
              include: {
                producer: true
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
                    producer: true
                  }
                }
              }
            }
          }
        },
        invoice: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Filtrer les éléments pour ne renvoyer que ceux appartenant au producteur
    const ordersWithFilteredItems = ordersWithProducerItems.map(order => {
      // Filtrer les items qui appartiennent au producteur
      const filteredItems = order.items.filter(item => 
        item.product.producerId === producerId
      )
      
      // Filtrer les bookings qui appartiennent au producteur
      const filteredBookings = order.bookings.filter(booking => 
        booking.deliverySlot.product.producerId === producerId
      )

      // Calculer le sous-total des produits du producteur dans cette commande
      const producerItemsTotal = filteredItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      )

      const producerBookingsTotal = filteredBookings.reduce(
        (sum, booking) => {
          const price = booking.price || booking.deliverySlot.product.price
          return sum + (price * booking.quantity)
        }, 0
      )

      const producerTotal = producerItemsTotal + producerBookingsTotal

      return {
        ...order,
        items: filteredItems,
        bookings: filteredBookings,
        total: producerTotal,
        invoice: order.invoice
      }
    })

    return NextResponse.json(ordersWithFilteredItems)
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error)
    return new NextResponse("Erreur lors de la récupération des commandes", { status: 500 })
  }
}, ["PRODUCER"])