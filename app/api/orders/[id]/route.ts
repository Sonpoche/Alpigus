// app/api/orders/[id]/route.ts
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
    const orderId = context.params.id;
    
    // Vérifier si la commande existe avec toutes les relations nécessaires
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
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

    // Pour les clients, vérifier si la commande leur appartient
    if (session.user.role === 'CLIENT' && order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 });
    }

    // Pour les producteurs, vérifier s'ils ont un produit dans cette commande
    if (session.user.role === 'PRODUCER') {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      });

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 });
      }

      // Vérifier si un produit du producteur est dans la commande
      const hasProducerProduct = order.items.some(item => 
        item.product.producerId === producer.id
      );

      if (!hasProducerProduct) {
        return new NextResponse("Non autorisé", { status: 403 });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error);
    return new NextResponse("Erreur lors de la récupération de la commande", { status: 500 });
  }
});

// Fonction pour annuler une commande (uniquement pour les commandes en attente)
export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id;
    const body = await req.json();
    const { status } = body;
    
    // Vérifier si la commande existe
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

    // Un client ne peut modifier que ses propres commandes
    if (session.user.role === 'CLIENT' && order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 });
    }

    // Un client ne peut annuler que les commandes en attente
    if (session.user.role === 'CLIENT' && status === 'CANCELLED' && order.status !== 'PENDING') {
      return new NextResponse("Seules les commandes en attente peuvent être annulées", { status: 400 });
    }

    // Effectuer les modifications dans une transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de la commande
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      // 2. Si la commande est annulée, retourner les produits au stock
      if (status === 'CANCELLED') {
        // Retourner les articles au stock
        for (const item of order.items) {
          await tx.stock.update({
            where: { productId: item.productId },
            data: {
              quantity: {
                increment: item.quantity
              }
            }
          });
        }
        
        // Retourner les réservations au stock et libérer les créneaux
        for (const booking of order.bookings) {
          // Mettre à jour le statut de la réservation
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CANCELLED' }
          });
          
          // Libérer le créneau
          const slot = await tx.deliverySlot.findUnique({
            where: { id: booking.slotId }
          });
          
          if (slot) {
            await tx.deliverySlot.update({
              where: { id: booking.slotId },
              data: {
                reserved: {
                  decrement: booking.quantity
                }
              }
            });
          }
          
          // Retourner au stock
          const product = await tx.deliverySlot.findUnique({
            where: { id: booking.slotId },
            include: { product: true }
          });
          
          if (product && product.product.id) {
            await tx.stock.update({
              where: { productId: product.product.id },
              data: {
                quantity: {
                  increment: booking.quantity
                }
              }
            });
          }
        }
      }

      return updated;
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la commande:", error);
    return new NextResponse("Erreur lors de la mise à jour de la commande", { status: 500 });
  }
});