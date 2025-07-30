// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation sécurisée de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const notificationId = pathSegments[pathSegments.indexOf('notifications') + 1]

    const { id } = validateData(paramsSchema, { id: notificationId })

    console.log(`📖 Marquage notification ${id} comme lue par user ${session.user.id}`)

    // 2. Récupération sécurisée de la notification avec vérification d'ownership
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        read: true,
        type: true,
        title: true,
        createdAt: true
      }
    })

    if (!notification) {
      console.warn(`⚠️ Tentative de lecture notification inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Notification non trouvée")
    }

    // 3. SÉCURITÉ CRITIQUE: Vérifier que la notification appartient à l'utilisateur
    if (notification.userId !== session.user.id) {
      console.warn(`⚠️ Tentative de lecture notification non autorisée ${id} par user ${session.user.id}`)
      throw createError.forbidden("Non autorisé - cette notification ne vous appartient pas")
    }

    // 4. Optimisation: vérifier si déjà lue
    if (notification.read) {
      console.log(`ℹ️ Notification ${id} déjà lue par user ${session.user.id}`)
      return NextResponse.json({
        success: true,
        message: 'Notification déjà marquée comme lue',
        notification: {
          id: notification.id,
          read: true,
          updatedAt: new Date().toISOString()
        }
      })
    }

    // 5. Mise à jour sécurisée - marquer comme lue
    const updatedNotification = await prisma.notification.update({
      where: { 
        id,
        userId: session.user.id // Double sécurité au niveau de la mise à jour
      },
      data: { 
        read: true 
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        data: true,
        read: true,
        createdAt: true,
        updatedAt: true
        // Ne pas exposer userId pour des raisons de sécurité
      }
    })

    console.log(`✅ Notification ${id} marquée comme lue pour user ${session.user.id}`)

    // 6. Log d'audit pour traçabilité (optionnel mais utile)
    console.log(`📋 Audit - Notification lue:`, {
      notificationId: id,
      userId: session.user.id,
      type: notification.type,
      timestamp: new Date().toISOString()
    })

    // 7. Réponse sécurisée avec les données mises à jour
    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue',
      notification: updatedNotification
    })

  } catch (error) {
    console.error("❌ Erreur marquage notification comme lue:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous les utilisateurs connectés
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 50, // 50 marquages max par minute (action fréquente)
    window: 60
  }
})

// Optionnel: Route DELETE pour supprimer une notification
export const DELETE = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation sécurisée de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const notificationId = pathSegments[pathSegments.indexOf('notifications') + 1]

    const { id } = validateData(paramsSchema, { id: notificationId })

    console.log(`🗑️ Suppression notification ${id} demandée par user ${session.user.id}`)

    // 2. Vérification d'existence et d'ownership
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true
      }
    })

    if (!notification) {
      throw createError.notFound("Notification non trouvée")
    }

    // 3. SÉCURITÉ: Vérifier ownership
    if (notification.userId !== session.user.id) {
      console.warn(`⚠️ Tentative suppression notification non autorisée ${id} par user ${session.user.id}`)
      throw createError.forbidden("Non autorisé - cette notification ne vous appartient pas")
    }

    // 4. Suppression sécurisée
    await prisma.notification.delete({
      where: { 
        id,
        userId: session.user.id // Double sécurité
      }
    })

    console.log(`✅ Notification ${id} supprimée pour user ${session.user.id}`)

    // 5. Log d'audit pour traçabilité
    console.log(`📋 Audit - Notification supprimée:`, {
      notificationId: id,
      userId: session.user.id,
      type: notification.type,
      title: notification.title,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Notification supprimée avec succès'
    })

  } catch (error) {
    console.error("❌ Erreur suppression notification:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 20, // 20 suppressions max par minute
    window: 60
  }
})