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

    return NextResponse.json(order);
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error);
    return new NextResponse("Erreur lors de la récupération de la commande", { status: 500 });
  }
});