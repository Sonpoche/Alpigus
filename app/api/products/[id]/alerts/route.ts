// app/api/products/[id]/alerts/route.ts
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

    // Récupérer les alertes configurées
    const alert = await prisma.stockAlert.findUnique({
      where: { productId }
    });

    return NextResponse.json(alert || { threshold: 0, percentage: false, emailAlert: true });
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes de stock:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}, ["PRODUCER", "ADMIN"]);

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const productId = context.params.id;
    const { threshold, percentage, emailAlert } = await req.json();
    
    // Validation
    if (threshold < 0) {
      return new NextResponse("Le seuil doit être positif", { status: 400 });
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

    // Créer ou mettre à jour l'alerte
    const alert = await prisma.stockAlert.upsert({
      where: { productId },
      update: {
        threshold,
        percentage: !!percentage,
        emailAlert: !!emailAlert
      },
      create: {
        productId,
        threshold,
        percentage: !!percentage,
        emailAlert: !!emailAlert
      }
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error("Erreur lors de la configuration des alertes de stock:", error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}, ["PRODUCER", "ADMIN"]);