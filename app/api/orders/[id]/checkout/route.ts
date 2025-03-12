// app/api/orders/[id]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const orderId = context.params.id;
      
      // Vérifier que la commande existe et appartient à l'utilisateur
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

      if (order.userId !== session.user.id) {
        return new NextResponse("Non autorisé", { status: 403 });
      }

      // Effectuer le processus de paiement/confirmation
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mettre à jour le statut de la commande
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CONFIRMED" }
        });
        
        // 2. Mettre à jour toutes les réservations de TEMPORARY à CONFIRMED
        await tx.booking.updateMany({
          where: {
            orderId: orderId,
            status: "TEMPORARY"
          },
          data: {
            status: "CONFIRMED",
            expiresAt: null // Supprimer la date d'expiration
          }
        });
        
        // 3. Logique supplémentaire de confirmation (envoi d'emails, etc.)
        
        return true;
      });

      return NextResponse.json({
        message: "Commande confirmée avec succès",
        orderId: orderId
      });
    } catch (error) {
      console.error("Erreur lors de la confirmation de la commande:", error);
      return new NextResponse(
        "Erreur lors de la confirmation de la commande",
        { status: 500 }
      );
    }
  },
  ["CLIENT"]
)