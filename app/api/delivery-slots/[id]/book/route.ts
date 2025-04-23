// app/api/delivery-slots/[id]/book/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NotificationService } from "@/lib/notification-service"

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const { quantity, orderId } = await req.json()

      if (!quantity || !orderId) {
        return new NextResponse(
          "Quantité et ID de commande requis", 
          { status: 400 }
        )
      }

      if (quantity <= 0) {
        return new NextResponse(
          "La quantité doit être positive", 
          { status: 400 }
        )
      }

      // Calculer la date d'expiration (2 heures à partir de maintenant)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2);

      // Effectuer la réservation dans une transaction
      const booking = await prisma.$transaction(async (tx) => {
        // 1. Vérifier le créneau
        const slot = await tx.deliverySlot.findUnique({
          where: { id: context.params.id },
          include: {
            product: {
              include: {
                stock: true
              }
            }
          }
        })

        if (!slot) {
          throw new Error("Créneau non trouvé")
        }

        if (!slot.isAvailable) {
          throw new Error("Créneau non disponible")
        }

        const availableCapacity = slot.maxCapacity - slot.reserved
        if (quantity > availableCapacity) {
          throw new Error("Capacité insuffisante pour ce créneau")
        }

        // 2. Vérifier le stock
        if (!slot.product.stock || quantity > slot.product.stock.quantity) {
          throw new Error("Stock insuffisant")
        }

        // 3. Vérifier que la commande existe et appartient à l'utilisateur
        const order = await tx.order.findUnique({
          where: { id: orderId }
        })

        if (!order) {
          throw new Error("Commande non trouvée")
        }
        
        if (order.userId !== session.user.id) {
          throw new Error("Cette commande ne vous appartient pas")
        }

        // 4. Créer la réservation avec statut TEMPORARY, date d'expiration et prix du produit
        const newBooking = await tx.booking.create({
          data: {
            slotId: slot.id,
            orderId,
            quantity,
            price: slot.product.price, // Ajout du prix du produit
            status: "TEMPORARY",
            expiresAt // Ajout de la date d'expiration
          }
        })

        // 5. Mettre à jour le créneau
        await tx.deliverySlot.update({
          where: { id: slot.id },
          data: {
            reserved: slot.reserved + quantity
          }
        })

        // 6. Mettre à jour le stock
        await tx.stock.update({
          where: { productId: slot.product.id },
          data: {
            quantity: slot.product.stock!.quantity - quantity
          }
        })

        // 7. Mettre à jour le total de la commande
        const orderItems = await tx.orderItem.findMany({
          where: { orderId },
          include: { product: true }
        });

        const bookings = await tx.booking.findMany({
          where: { orderId },
          include: { 
            deliverySlot: {
              include: { product: true }
            }
          }
        });

        const itemsTotal = orderItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );

        const bookingsTotal = bookings.reduce((sum, booking) => 
          sum + (booking.price || booking.deliverySlot.product.price) * booking.quantity, 0
        );

        await tx.order.update({
          where: { id: orderId },
          data: { total: itemsTotal + bookingsTotal }
        });

        return newBooking
      })

      // Récupérer le booking complet avec la relation deliverySlot pour l'envoyer à la notification
      const bookingWithSlot = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          deliverySlot: {
            include: {
              product: true
            }
          }
        }
      });

      if (bookingWithSlot) {
        // Envoyer une notification au client
        await NotificationService.sendDeliveryBookingNotification(bookingWithSlot)
      }

      return NextResponse.json(booking)
    } catch (error) {
      console.error("Erreur lors de la réservation:", error)
      return new NextResponse(
        error instanceof Error ? error.message : "Erreur lors de la réservation",
        { status: 400 }
      )
    }
  },
  ["CLIENT"]
)