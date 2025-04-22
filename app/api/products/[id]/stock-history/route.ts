// app/api/products/[id]/stock-history/route.ts
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
    const productId = context.params.id;
    
    // Vérifier que le produit appartient au producteur
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { producer: true }
    });

    if (!product) {
      return new NextResponse("Produit non trouvé", { status: 404 });
    }

    if (product.producer.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return new NextResponse("Non autorisé", { status: 403 });
    }

    // Récupérer l'historique du stock
    const history = await prisma.stockHistory.findMany({
      where: { productId },
      orderBy: { date: 'asc' }
    });

    // Calculer les statistiques
    const stock = await prisma.stock.findUnique({
      where: { productId }
    });
    
    // Calculer la vitesse d'écoulement hebdomadaire
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const salesHistory = await prisma.stockHistory.findMany({
      where: { 
        productId,
        type: 'sale',
        date: {
          gte: oneMonthAgo,
          lte: now
        }
      }
    });
    
    // Calculer la somme des ventes
    const totalSales = salesHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    // Calcul du taux hebdomadaire (sur 4 semaines)
    const weeklyRate = totalSales / 4;

    return NextResponse.json({
      history,
      currentStock: stock?.quantity || 0,
      weeklyRate,
      daysUntilEmpty: weeklyRate > 0 ? Math.floor((stock?.quantity || 0) / (weeklyRate / 7)) : null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique du stock:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}, ["PRODUCER", "ADMIN"]);