// app/api/orders/[id]/summary/route.ts
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
    
    // Créer un résumé simplifié du panier
    const cartItems = order.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: {
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
        unit: item.product.unit
      }
    }));
    
    // Ajouter les réservations au résumé
    const bookings = order.bookings
      .filter(booking => booking.status !== 'CANCELLED')
      .map(booking => ({
        id: booking.id,
        quantity: booking.quantity,
        price: booking.price || booking.deliverySlot.product.price,
        product: {
          id: booking.deliverySlot.product.id,
          name: booking.deliverySlot.product.name,
          image: booking.deliverySlot.product.image,
          unit: booking.deliverySlot.product.unit
        }
      }));
    
    // Combiner les articles et les réservations
    const allItems = [...cartItems, ...bookings];
    
    // Calculer le total
    const totalPrice = allItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const summary = {
      itemCount: allItems.length,
      items: allItems,
      totalPrice
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Erreur lors de la récupération du résumé du panier:", error);
    return new NextResponse("Erreur lors de la récupération du résumé du panier", { status: 500 });
  }
});