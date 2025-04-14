// app/api/test/notification/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { NotificationType } from "@/types/notification"

export async function GET() {
  try {
    // Créer une notification de test pour le premier producteur trouvé
    const producer = await prisma.producer.findFirst();
    
    if (!producer) {
      return NextResponse.json({ error: "Aucun producteur trouvé" }, { status: 404 });
    }
    
    const notification = await prisma.notification.create({
      data: {
        userId: producer.userId,
        type: NotificationType.NEW_ORDER,
        title: 'Test de notification',
        message: `Ceci est une notification de test créée manuellement.`,
        link: `/producer/orders`,
        read: false
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      notification,
      message: "Notification de test créée avec succès"
    });
  } catch (error) {
    console.error("Erreur de test notification:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la notification de test" }, { status: 500 });
  }
}