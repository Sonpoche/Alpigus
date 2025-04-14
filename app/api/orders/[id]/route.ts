// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, ProductType, Prisma } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id;

    // Vérifier que la commande existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
            product: true
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return new NextResponse("Commande non trouvée", { status: 404 });
    }

    // Si c'est un client, vérifier que la commande lui appartient
    if (session.user.role === 'CLIENT' && order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 });
    }

    // Si c'est un producteur, vérifier qu'il a des produits dans cette commande
    if (session.user.role === 'PRODUCER') {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      });

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 });
      }

      const hasProducts = order.items.some(item => 
        item.product.producerId === producer.id
      );
      
      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producerId === producer.id
      );

      if (!hasProducts && !hasBookings) {
        return new NextResponse("Non autorisé", { status: 403 });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error);
    return new NextResponse("Erreur lors de la récupération de la commande", { status: 500 });
  }
});

export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id
    const body = await req.json()
    const { status } = body

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return new NextResponse("Statut invalide", { status: 400 })
    }

    // Récupérer l'ordre pour vérifier les autorisations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
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
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!order) {
      return new NextResponse("Commande non trouvée", { status: 404 })
    }

    // Vérifier si c'est un producteur qui a des produits dans cette commande
    if (session.user.role === 'PRODUCER') {
      // Récupérer l'ID du producteur
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      // Vérifier si ce producteur a des produits dans cette commande
      const hasProducts = order.items.some(item => 
        item.product.producer.userId === session.user.id
      )

      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producer.userId === session.user.id
      )

      if (!hasProducts && !hasBookings) {
        return new NextResponse("Non autorisé - Vous n'avez pas de produits dans cette commande", { status: 403 })
      }

      // Vérifier les transitions d'état valides pour un producteur
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED', 'CANCELLED'],
        DELIVERED: [],
        CANCELLED: []
      }

      if (!validTransitions[order.status].includes(status as OrderStatus)) {
        return new NextResponse(`Transition de statut invalide: ${order.status} → ${status}`, { status: 400 })
      }
    } 
    // Si c'est un admin, il n'y a pas de restrictions
    else if (session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    // Conserver l'ancien statut pour les notifications
    const oldStatus = order.status;

    // Mettre à jour le statut de la commande
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
      include: {
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
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Convertir les dates en chaînes pour la notification
    const orderWithStringDates = {
      ...updatedOrder,
      createdAt: updatedOrder.createdAt instanceof Date ? updatedOrder.createdAt.toISOString() : updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt instanceof Date ? updatedOrder.updatedAt.toISOString() : updatedOrder.updatedAt,
      bookings: updatedOrder.bookings.map(booking => ({
        ...booking,
        price: booking.price === null ? undefined : booking.price, // Convertir null en undefined
        deliverySlot: {
          ...booking.deliverySlot,
          date: booking.deliverySlot.date instanceof Date ? booking.deliverySlot.date.toISOString() : booking.deliverySlot.date
        }
      }))
    }

    // Envoyer une notification de changement de statut
    await NotificationService.sendOrderStatusChangeNotification(orderWithStringDates, oldStatus);

    // Si la commande est annulée, mettre à jour le stock
    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      await handleCancellation(order)
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de la commande:", error)
    return new NextResponse("Erreur lors de la mise à jour du statut de la commande", { status: 500 })
  }
}, ["PRODUCER", "ADMIN"])

// Fonction pour gérer la logique d'annulation
async function handleCancellation(order: any) {
  // 1. Retourner les articles au stock
  for (const item of order.items) {
    await prisma.stock.update({
      where: { productId: item.product.id },
      data: {
        quantity: {
          increment: item.quantity
        }
      }
    })
  }

  // 2. Retourner les réservations au stock et libérer les créneaux
  for (const booking of order.bookings) {
    // Mettre à jour le statut de la réservation
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    })
    
    // Libérer le créneau
    await prisma.deliverySlot.update({
      where: { id: booking.slotId },
      data: {
        reserved: {
          decrement: booking.quantity
        }
      }
    })
    
    // Retourner au stock
    await prisma.stock.update({
      where: { productId: booking.deliverySlot.product.id },
      data: {
        quantity: {
          increment: booking.quantity
        }
      }
    })
  }
}

export const DELETE = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const orderId = context.params.id;

      // Vérifier que la commande existe
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          bookings: true
        }
      });

      if (!order) {
        return new NextResponse("Commande non trouvée", { status: 404 });
      }

      // Seul l'utilisateur qui a créé la commande ou un admin peut la supprimer
      if (order.userId !== session.user.id && session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 });
      }

      // Supprimer la commande et tous les éléments associés
      await prisma.order.delete({
        where: { id: orderId }
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Erreur lors de la suppression de la commande:", error);
      return new NextResponse("Erreur lors de la suppression de la commande", { status: 500 });
    }
  }, 
  ["CLIENT", "ADMIN"]
);