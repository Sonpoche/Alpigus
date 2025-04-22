// app/api/products/[id]/production-schedule/route.ts
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
    const { searchParams } = new URL(req.url);
    const futureOnly = searchParams.get('future') === 'true';
    
    // Déterminer les contraintes de visibilité selon le rôle
    let visibilityConstraint = {};
    if (session.user.role === 'CLIENT') {
      visibilityConstraint = { isPublic: true };
    }
    
    // Contrainte de date future si demandée
    let dateConstraint = {};
    if (futureOnly) {
      dateConstraint = {
        date: {
          gte: new Date()
        }
      };
    }
    
    // Récupérer le calendrier de production
    const schedule = await prisma.productionSchedule.findMany({
      where: { 
        productId,
        ...visibilityConstraint,
        ...dateConstraint
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Erreur lors de la récupération du calendrier de production:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
});

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const productId = context.params.id;
    const { date, quantity, note, isPublic } = await req.json();
    
    // Validation
    if (!date || !quantity || quantity <= 0) {
      return new NextResponse("Date et quantité positive requises", { status: 400 });
    }
    
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

    // Créer l'entrée dans le calendrier
    const scheduleEntry = await prisma.productionSchedule.create({
      data: {
        productId,
        date: new Date(date),
        quantity,
        note,
        isPublic: isPublic !== undefined ? isPublic : true
      }
    });

    return NextResponse.json(scheduleEntry);
  } catch (error) {
    console.error("Erreur lors de l'ajout au calendrier de production:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}, ["PRODUCER", "ADMIN"]);