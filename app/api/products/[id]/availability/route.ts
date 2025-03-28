// app/api/products/[id]/availability/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const productId = context.params.id;
      const { available } = await req.json();
      
      if (typeof available !== 'boolean') {
        return new NextResponse("Le paramètre 'available' doit être un booléen", { status: 400 });
      }
      
      // Vérifier que le produit existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { producer: true }
      });
      
      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 });
      }
      
      // Vérifier les autorisations (admin ou propriétaire)
      if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
        return new NextResponse("Non autorisé", { status: 403 });
      }
      
      // Mettre à jour la disponibilité
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { available }
      });
      
      return NextResponse.json(updatedProduct);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la disponibilité:", error);
      return new NextResponse(
        "Erreur lors de la mise à jour de la disponibilité", 
        { status: 500 }
      );
    }
  },
  ["ADMIN", "PRODUCER"] // Seuls les admins et les producteurs peuvent modifier la disponibilité
);