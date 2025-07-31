// app/api/products/[id]/production-schedule/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const scheduleQuerySchema = z.object({
  future: z.coerce.boolean().default(false),
  limit: z.coerce.number().min(1).max(100).default(50)
})

const createScheduleSchema = z.object({
  date: z.string().datetime('Date invalide'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  note: z.string().max(500, 'Note trop longue').optional(),
  isPublic: z.boolean().default(true)
}).strict()

// GET - Obtenir le calendrier de production
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const queryParams = {
      future: searchParams.get('future'),
      limit: searchParams.get('limit')
    }

    const { future, limit } = validateData(scheduleQuerySchema, queryParams)

    console.log(`📅 Récupération calendrier production produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'existence du produit
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        producer: {
          select: {
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    // 4. Construction des contraintes selon le rôle
    let visibilityConstraint = {}
    let canViewPrivate = false

    if (session.user.role === 'ADMIN') {
      canViewPrivate = true
      // Admin voit tout
    } else if (session.user.role === 'PRODUCER' && product.producer.userId === session.user.id) {
      canViewPrivate = true
      // Producteur voit ses propres plannings privés et publics
    } else if (session.user.role === 'CLIENT') {
      // Clients ne voient que les plannings publics
      visibilityConstraint = { isPublic: true }
    } else {
      throw createError.forbidden("Accès non autorisé à ce calendrier de production")
    }

    // 5. Contraintes de date si demandées
    let dateConstraint = {}
    if (future) {
      dateConstraint = {
        date: {
          gte: new Date()
        }
      }
    }

    // 6. Récupération sécurisée du calendrier
    const schedule = await prisma.productionSchedule.findMany({
      where: { 
        productId: id,
        ...visibilityConstraint,
        ...dateConstraint
      },
      orderBy: { date: 'asc' },
      take: limit
    })

    // 7. Calcul des statistiques pour propriétaires
    let statistics = null
    if (canViewPrivate) {
      const now = new Date()
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(now.getMonth() + 1)

      const upcomingProduction = await prisma.productionSchedule.aggregate({
        where: {
          productId: id,
          date: {
            gte: now,
            lte: oneMonthFromNow
          }
        },
        _sum: {
          quantity: true
        },
        _count: {
          id: true
        }
      })

      statistics = {
        upcomingEntries: upcomingProduction._count.id,
        plannedQuantity: upcomingProduction._sum.quantity || 0,
        nextProductionDate: schedule.find(s => new Date(s.date) > now)?.date || null
      }
    }

    // 8. Log d'audit sécurisé
    console.log(`📋 Audit - Calendrier production consulté:`, {
      productId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      entriesCount: schedule.length,
      canViewPrivate,
      futureOnly: future,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Calendrier récupéré: ${schedule.length} entrées`)

    // 9. Réponse sécurisée
    const response = {
      productId: id,
      product: {
        name: product.name,
        unit: product.unit
      },
      schedule: schedule.map(entry => ({
        id: entry.id,
        date: entry.date.toISOString(),
        quantity: entry.quantity,
        note: canViewPrivate ? entry.note : null, // Notes masquées pour clients
        isPublic: entry.isPublic,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      })),
      ...(statistics && { statistics }),
      meta: {
        count: schedule.length,
        futureOnly: future,
        accessLevel: canViewPrivate ? 'full' : 'public',
        viewerRole: session.user.role
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération calendrier production:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'], // Tous peuvent consulter
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// POST - Ajouter une entrée au calendrier de production
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des données
    const rawData = await request.json()
    const { date, quantity, note, isPublic } = validateData(createScheduleSchema, rawData)

    console.log(`📅 Ajout calendrier production produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: {
          select: {
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez planifier que la production de vos propres produits")
    }

    // 4. Validation de logique métier
    const plannedDate = new Date(date)
    const now = new Date()
    
    if (plannedDate < now) {
      throw createError.validation("Impossible de planifier une production dans le passé")
    }

    // Vérifier s'il y a déjà une planification le même jour
    const existingSchedule = await prisma.productionSchedule.findFirst({
      where: {
        productId: id,
        date: {
          gte: new Date(plannedDate.toDateString()),
          lt: new Date(plannedDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    if (existingSchedule) {
      throw createError.validation("Il existe déjà une planification pour cette date")
    }

    // 5. Création sécurisée de l'entrée
    const scheduleEntry = await prisma.productionSchedule.create({
      data: {
        productId: id,
        date: plannedDate,
        quantity,
        note: note?.trim() || null,
        isPublic
      }
    })

    // 6. Log d'audit sécurisé
    console.log(`📋 Audit - Planification production ajoutée:`, {
      scheduleId: scheduleEntry.id,
      productId: id,
      createdBy: session.user.id,
      role: session.user.role,
      date: plannedDate.toISOString(),
      quantity,
      isPublic,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Production planifiée: ${quantity} ${product.unit} le ${plannedDate.toLocaleDateString()}`)

    return NextResponse.json(scheduleEntry, { status: 201 })

  } catch (error) {
    console.error("❌ Erreur ajout calendrier production:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'], // Seuls producteurs et admins peuvent planifier
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 20, // Planifications limitées
    window: 60
  }
})