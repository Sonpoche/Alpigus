// app/api/test/notification/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env-validation"

// GET - Créer une notification de test (DÉVELOPPEMENT + ADMIN uniquement)
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // Bloquer complètement en production
    if (env.NODE_ENV === 'production') {
      throw createError.forbidden("Routes de test désactivées en production")
    }

    console.log(`🧪 Test notification par admin ${session.user.id}`)

    // Récupérer un producteur pour le test
    const producer = await prisma.producer.findFirst({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!producer) {
      throw createError.notFound("Aucun producteur trouvé pour le test")
    }
    
    // Créer une notification de test
    const notification = await prisma.notification.create({
      data: {
        userId: producer.userId,
        type: "NEW_ORDER", // Utilisation du type string direct
        title: '🧪 Notification de test',
        message: `Notification de test créée par ${session.user.name || 'Admin'} à ${new Date().toLocaleTimeString('fr-FR')}`,
        link: `/producer/dashboard`,
        data: JSON.stringify({
          isTest: true,
          createdBy: session.user.id,
          createdByName: session.user.name,
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV
        }),
        read: false
      }
    })
    
    // Log d'audit sécurisé
    console.log(`📋 Audit - Notification test créée:`, {
      notificationId: notification.id,
      createdBy: session.user.id,
      recipientUserId: producer.userId,
      producerId: producer.id,
      type: notification.type,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Notification test créée: ${notification.id}`)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        notification: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt
        },
        recipient: {
          userId: producer.userId,
          userName: producer.user.name,
          userEmail: producer.user.email,
          companyName: producer.companyName
        },
        testInfo: {
          environment: env.NODE_ENV,
          createdBy: session.user.name || session.user.id,
          timestamp: new Date().toISOString()
        }
      },
      message: "Notification de test créée avec succès",
      warning: "⚠️ Ceci est une notification de test créée en environnement de développement"
    })

  } catch (error) {
    console.error("❌ Erreur test notification:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'], // Seuls les admins peuvent créer des tests
  allowedMethods: ['GET'], 
  rateLimit: {
    requests: 10, // Limité pour éviter le spam
    window: 300   // 5 minutes
  }
})