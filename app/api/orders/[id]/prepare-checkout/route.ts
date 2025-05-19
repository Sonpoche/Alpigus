// app/api/orders/[id]/prepare-checkout/route.ts
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
      const body = await req.json();
      const { 
        deliveryType, 
        deliveryInfo, 
        paymentMethod, 
        paymentStatus = "PENDING" 
      } = body;
      
      // Vérifier que la commande existe et appartient à l'utilisateur
      const order = await prisma.order.findUnique({
        where: { 
          id: orderId,
          userId: session.user.id
        }
      });

      if (!order) {
        return new NextResponse("Commande non trouvée", { status: 404 });
      }

      // Calculer les frais de livraison
      const deliveryFee = deliveryType === 'delivery' ? 15 : 0;
      const totalWithDelivery = order.total + deliveryFee;

      // Mettre à jour la commande avec les informations de livraison et méthode de paiement
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          total: totalWithDelivery,
          // Ajouter les informations additionnelles
          metadata: JSON.stringify({
            deliveryType,
            deliveryInfo: deliveryType === 'delivery' ? deliveryInfo : null,
            paymentMethod,
            paymentStatus
          })
        }
      });

      return NextResponse.json({
        message: "Commande préparée avec succès",
        orderId: orderId
      });
    } catch (error) {
      console.error("Erreur lors de la préparation de la commande:", error);
      return new NextResponse(
        "Erreur lors de la préparation de la commande",
        { status: 500 }
      );
    }
  },
  ["CLIENT"]
)