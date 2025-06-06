// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, UserRole } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'
import { WalletService } from "@/lib/wallet-service"

export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id
    const body = await req.json()
    const { status } = body

    console.log(`Mise à jour du statut de la commande ${orderId} vers ${status}`);

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
      console.log(`Commande ${orderId} non trouvée`);
      return new NextResponse("Commande non trouvée", { status: 404 })
    }

    // Vérifier si c'est un producteur qui a des produits dans cette commande
    if (session.user.role === UserRole.PRODUCER) {
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
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.DRAFT]: [],
        [OrderStatus.INVOICE_PENDING]: [],
        [OrderStatus.INVOICE_PAID]: [],
        [OrderStatus.INVOICE_OVERDUE]: []
      }

      if (!validTransitions[order.status].includes(status as OrderStatus)) {
        return new NextResponse(`Transition de statut invalide: ${order.status} → ${status}`, { status: 400 })
      }
    } 
    // Si c'est un admin, il n'y a pas de restrictions
    else if (session.user.role !== UserRole.ADMIN) {
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

    console.log(`Statut de la commande ${orderId} mis à jour de ${oldStatus} à ${status}`);

    // Envoyer une notification de changement de statut
    await NotificationService.sendOrderStatusChangeNotification(updatedOrder, oldStatus);
    
    // Envoyer également une notification au client
    await NotificationService.sendOrderStatusToClientNotification(updatedOrder);

    // Gestion des transactions selon le nouveau statut
    if (status !== oldStatus) {
      try {
        console.log(`Mise à jour des transactions pour la commande ${orderId} passant à ${status}`);
        
        // Si c'est une nouvelle commande, ajouter les transactions
        if (status === OrderStatus.CONFIRMED && oldStatus === OrderStatus.PENDING) {
          try {
            await WalletService.addSaleTransaction(orderId);
            console.log(`Transactions ajoutées avec succès pour la commande ${orderId}`);
          } catch (walletError) {
            console.error(`Erreur lors de l'ajout des transactions pour la commande ${orderId}:`, walletError);
          }
        } 
        // Si la commande est maintenant livrée, libérer les fonds
        else if (status === OrderStatus.DELIVERED) {
          try {
            await WalletService.updateTransactionsOnOrderStatus(orderId, status as OrderStatus);
            console.log(`Transactions mises à jour pour la commande livrée ${orderId}`);
          } catch (walletError) {
            console.error(`Erreur lors de la mise à jour du portefeuille pour la commande ${orderId}:`, walletError);
          }
        }
      } catch (walletError) {
        console.error("Erreur globale lors de la mise à jour du portefeuille:", walletError);
        // Continuer le processus malgré l'erreur
      }
    }

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