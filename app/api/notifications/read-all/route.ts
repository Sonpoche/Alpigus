// app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity } from "@/lib/api-security"
import { handleError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    console.log(`📖 Marquage toutes notifications comme lues pour user ${session.user.id}`)

    // 1. Compter d'abord les notifications non lues pour le logging
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    })

    if (unreadCount === 0) {
      console.log(`ℹ️ Aucune notification non lue pour user ${session.user.id}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Aucune notification à marquer comme lue',
        updatedCount: 0
      })
    }

    // 2. Marquer toutes les notifications de l'utilisateur comme lues
    const updateResult = await prisma.notification.updateMany({
      where: {
        userId: session.user.id, // SÉCURITÉ: Limiter strictement aux notifications de l'utilisateur
        read: false // Optimisation: ne mettre à jour que celles qui ne sont pas déjà lues
      },
      data: {
        read: true
      }
    })

    console.log(`✅ ${updateResult.count} notifications marquées comme lues pour user ${session.user.id}`)

    // 3. Log d'audit pour traçabilité
    if (updateResult.count > 0) {
      console.log(`📋 Audit - Notifications lues en masse:`, {
        userId: session.user.id,
        count: updateResult.count,
        timestamp: new Date().toISOString(),
        userRole: session.user.role
      })
    }

    // 4. Réponse sécurisée avec informations utiles
    return NextResponse.json({ 
      success: true,
      message: `${updateResult.count} notification(s) marquée(s) comme lue(s)`,
      updatedCount: updateResult.count
    })

  } catch (error) {
    console.error("❌ Erreur marquage notifications comme lues:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous les utilisateurs connectés
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10, // 10 tentatives max par minute (action moins fréquente)
    window: 60
  }
})