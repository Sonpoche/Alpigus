// app/api/webhook/notifications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { NotificationType } from "@/types/notification"

// Cette API sera appelée par un système externe (comme un service de paiement)
// ou par notre propre code backend pour créer des notifications
export async function POST(req: Request) {
  try {
    // Vérification d'une clé API (à implémenter selon vos besoins de sécurité)
    // Si cette API est appelée depuis un service externe, vous devriez ajouter une authentification
    
    const body = await req.json()
    const { userId, type, title, message, link, data } = body
    
    // Validation de base
    if (!userId || !type || !title || !message) {
      return new NextResponse("Paramètres manquants", { status: 400 })
    }
    
    // Vérifier que le type est valide
    if (!Object.values(NotificationType).includes(type)) {
      return new NextResponse("Type de notification invalide", { status: 400 })
    }
    
    // Créer la notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        data,
        read: false
      }
    })
    
    return NextResponse.json(notification)
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error)
    return new NextResponse("Erreur lors de la création de la notification", { status: 500 })
  }
}