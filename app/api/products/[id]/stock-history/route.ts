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
    
    // Vérifier que le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { producer: true }
    });

    if (!product) {
      return new NextResponse("Produit non trouvé", { status: 404 });
    }

    // Vérifier les autorisations
    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 });
    }

    // Récupérer l'historique du stock
    const history = await prisma.stockHistory.findMany({
      where: { productId },
      orderBy: { date: 'asc' }
    });

    // Récupérer le stock actuel
    const stock = await prisma.stock.findUnique({
      where: { productId }
    });
    
    // Calculer la vitesse d'écoulement hebdomadaire
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Trouver toutes les entrées de type "sale" pour calculer le taux d'écoulement
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
    
    // Calculer la somme des ventes (quantités négatives représentant les ventes)
    const totalSales = salesHistory.reduce((sum, record) => {
      const change = record.quantity - (history.find(h => 
        new Date(h.date) < new Date(record.date)
      )?.quantity || 0);
      
      return sum + (change < 0 ? Math.abs(change) : 0);
    }, 0);
    
    // Calcul du taux hebdomadaire (sur 4 semaines)
    const weeklyRate = totalSales / 4 || 1; // Éviter division par zéro
    
    // Calculer le nombre de jours avant rupture
    const daysUntilEmpty = stock?.quantity 
      ? Math.floor((stock.quantity / (weeklyRate / 7)))
      : null;

    // Formater les données pour correspondre à l'interface attendue
    const formattedHistory = history.map(record => ({
      id: record.id,
      date: record.date.toISOString(),
      quantity: record.quantity,
      type: record.type
    }));

    return NextResponse.json({
      history: formattedHistory,
      currentStock: stock?.quantity || 0,
      weeklyRate,
      daysUntilEmpty
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique du stock:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}, ["PRODUCER", "ADMIN"]);