// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { NotificationType } from "@/types/notification"
import { z } from "zod"

// Schéma de validation pour les paramètres de requête GET
const notificationsQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional().default('false'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  type: z.string().optional() // Filtrer par type de notification
})

// Schéma de validation pour la création de notifications (POST)
const createNotificationSchema = z.object({
  userId: commonSchemas.id,
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Type de notification invalide' })
  }),
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  message: z.string().min(1, 'Message requis').max(1000, 'Message trop long'),
  link: z.string().max(500, 'Lien trop long').optional(),
  data: z.record(z.any()).optional()
}).strict()

// GET /api/notifications - Récupérer les notifications de l'utilisateur
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      unread: searchParams.get('unread'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      type: searchParams.get('type')
    }

    const validatedQuery = validateData(notificationsQuerySchema, queryParams)
    const { unread, type } = validatedQuery
    const limit = validatedQuery.limit ?? 50
    const offset = validatedQuery.offset ?? 0
    
    console.log(`📬 Récupération notifications pour user ${session.user.id} (unread: ${unread}, limit: ${limit})`)

    // 2. Construction des filtres sécurisés
    const whereClause: any = {
      userId: session.user.id // SÉCURITÉ: Limiter aux notifications de l'utilisateur connecté
    }

    if (unread === 'true') {
      whereClause.read = false
    }

    if (type) {
      // Vérifier que le type est valide
      if (!Object.values(NotificationType).includes(type as NotificationType)) {
        throw createError.validation(`Type de notification invalide: ${type}`)
      }
      whereClause.type = type
    }

    // 3. Récupération sécurisée des notifications avec pagination
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
      }),
      
      // Compter le total pour la pagination
      prisma.notification.count({ where: whereClause }),
      
      // Compter les non lues séparément
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false
        }
      })
    ])

    console.log(`✅ ${notifications.length} notifications récupérées pour user ${session.user.id}`)

    // 4. Réponse sécurisée avec métadonnées de pagination
    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      counts: {
        total: totalCount,
        unread: unreadCount
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération notifications:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous les utilisateurs connectés
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 60, // 60 requêtes max
    window: 60    // par minute
  }
})

// POST /api/notifications - Créer une nouvelle notification (ADMIN uniquement)
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des données d'entrée
    const rawData = await request.json()
    const { userId, type, title, message, link, data } = validateData(createNotificationSchema, rawData)

    console.log(`📤 Création notification par admin ${session.user.id} pour user ${userId}`)

    // 2. Vérification que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true }
    })

    if (!targetUser) {
      throw createError.notFound("Utilisateur cible non trouvé")
    }

    // 3. Validation du lien si fourni
    if (link) {
      try {
        new URL(link, 'https://example.com') // Validation basique de l'URL
      } catch (urlError) {
        throw createError.validation("Lien invalide")
      }
    }

    // 4. Validation des données JSON si fournies
    if (data && typeof data !== 'object') {
      throw createError.validation("Les données doivent être un objet JSON valide")
    }

    // 5. Création sécurisée de la notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as string,
        title,
        message,
        link,
        data: data ? data : undefined,
        read: false
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
      }
    })

    console.log(`✅ Notification créée: ${notification.id} pour user ${userId}`)

    // 6. Log d'audit pour traçabilité
    console.log(`📋 Audit - Notification créée:`, {
      notificationId: notification.id,
      createdBy: session.user.id,
      targetUser: userId,
      type,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(notification, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur création notification:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['ADMIN'], // Seuls les admins peuvent créer des notifications
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 20, // 20 créations max
    window: 60    // par minute
  }
})