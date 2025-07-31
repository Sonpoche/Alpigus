// app/api/products/[id]/alerts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const createAlertSchema = z.object({
  threshold: z.number().min(0, 'Seuil invalide').max(10000, 'Seuil trop élevé'),
  percentage: z.boolean().default(false),
  emailAlert: z.boolean().default(true)
}).strict()

// GET - Obtenir les alertes de stock configurées
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`🚨 Récupération alertes stock produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Vérification d'autorisation
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
      throw createError.forbidden("Vous ne pouvez consulter que les alertes de vos propres produits")
    }

    // 3. Récupération des alertes configurées
    const alert = await prisma.stockAlert.findUnique({
      where: { productId: id },
      select: {
        id: true,
        threshold: true,
        percentage: true,
        emailAlert: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 4. Récupération du stock actuel pour contexte
    const stock = await prisma.stock.findUnique({
      where: { productId: id },
      select: {
        quantity: true
      }
    })

    // 5. Calcul du statut d'alerte actuel
    const currentQuantity = stock?.quantity || 0
    let alertStatus = 'ok'
    let alertTriggered = false

    if (alert) {
      if (alert.percentage) {
        // Logique de pourcentage (nécessiterait une référence de stock "normal")
        // Pour simplifier, on considère 100 comme stock de référence
        const referenceStock = 100
        const thresholdQuantity = (alert.threshold / 100) * referenceStock
        alertTriggered = currentQuantity <= thresholdQuantity
      } else {
        // Seuil absolu
        alertTriggered = currentQuantity <= alert.threshold
      }

      alertStatus = alertTriggered ? 'triggered' : 'ok'
    }

    console.log(`✅ Alertes récupérées - Statut: ${alertStatus}`)

    // 6. Réponse sécurisée
    const response = {
      productId: id,
      product: {
        name: product.name,
        unit: product.unit
      },
      alert: alert || {
        threshold: 0,
        percentage: false,
        emailAlert: true,
        configured: false
      },
      currentStock: {
        quantity: currentQuantity,
        status: alertStatus,
        alertTriggered
      },
      meta: {
        hasAlert: !!alert,
        alertActive: alert?.emailAlert || false
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération alertes:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// POST - Configurer les alertes de stock
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des données
    const rawData = await request.json()
    const { threshold, percentage, emailAlert } = validateData(createAlertSchema, rawData)

    console.log(`🚨 Configuration alertes stock produit ${id} par ${session.user.role} ${session.user.id}`)

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
      throw createError.forbidden("Vous ne pouvez configurer que les alertes de vos propres produits")
    }

    // 4. Création/mise à jour sécurisée de l'alerte
    const alert = await prisma.stockAlert.upsert({
      where: { productId: id },
      update: {
        threshold,
        percentage,
        emailAlert
      },
      create: {
        productId: id,
        threshold,
        percentage,
        emailAlert
      }
    })

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Alertes stock configurées:`, {
      productId: id,
      configuredBy: session.user.id,
      role: session.user.role,
      threshold,
      percentage,
      emailAlert,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Alertes configurées: seuil ${threshold}${percentage ? '%' : ' unités'}`)

    return NextResponse.json(alert)

  } catch (error) {
    console.error("❌ Erreur configuration alertes:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10,
    window: 60
  }
})