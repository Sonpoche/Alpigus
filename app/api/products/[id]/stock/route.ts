// app/api/products/[id]/stock/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { NotificationService } from '@/lib/notification-service'

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

const updateStockSchema = z.object({
  quantity: z.number().min(0, 'Quantité invalide'),
  note: z.string().max(500, 'Note trop longue').optional()
}).strict()

// GET - Obtenir le stock d'un produit
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`📦 Récupération stock produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée du stock
    const stock = await prisma.stock.findUnique({
      where: { productId: id },
      include: {
        product: {
          include: {
            producer: {
              select: {
                id: true,
                userId: true,
                companyName: true
              }
            }
          }
        }
      }
    })

    if (!stock) {
      throw createError.notFound("Stock non trouvé")
    }

    // 3. Vérifications d'autorisation
    let canViewStock = false

    if (session.user.role === 'ADMIN') {
      canViewStock = true
    } else if (session.user.role === 'PRODUCER' && stock.product.producer.userId === session.user.id) {
      canViewStock = true
      console.log(`🏭 Producteur consulte le stock de son produit ${stock.product.name}`)
    } else if (session.user.role === 'CLIENT') {
      // Clients voient seulement si en stock ou pas
      const response = {
        productId: id,
        inStock: stock.quantity > 0,
        stockLevel: stock.quantity > 10 ? 'high' : 
                   stock.quantity > 5 ? 'medium' : 
                   stock.quantity > 0 ? 'low' : 'out'
      }
      return NextResponse.json(response)
    }

    if (!canViewStock) {
      throw createError.forbidden("Accès non autorisé au stock de ce produit")
    }

    // 4. Réponse détaillée pour producteur/admin
    const response = {
      id: stock.id,
      productId: stock.productId,
      quantity: stock.quantity,
      updatedAt: stock.updatedAt,
      product: {
        id: stock.product.id,
        name: stock.product.name,
        unit: stock.product.unit,
        minOrderQuantity: stock.product.minOrderQuantity
      },
      producer: {
        id: stock.product.producer.id,
        companyName: stock.product.producer.companyName
      }
    }

    console.log(`✅ Stock récupéré: ${stock.quantity} ${stock.product.unit}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur récupération stock:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100,
    window: 60
  }
})

// PATCH - Mettre à jour le stock d'un produit
export const PATCH = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    // 2. Validation des données
    const rawData = await request.json()
    const { quantity, note } = validateData(updateStockSchema, rawData)

    console.log(`📦 Mise à jour stock produit ${id} par ${session.user.role} ${session.user.id}`)

    // 3. Vérification d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: true,
        stock: true
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez modifier que le stock de vos propres produits")
    }

    // 4. Récupération de l'ancien stock pour comparaison
    const oldStock = product.stock

    // 5. Mise à jour sécurisée avec transaction
    const updatedStock = await prisma.$transaction(async (tx) => {
      // Calculer la différence pour l'historique
      const previousQuantity = oldStock?.quantity || 0
      const difference = quantity - previousQuantity
      const operationType = difference > 0 ? 'adjustment' : 
                           difference < 0 ? 'sale' : 'adjustment'

      // Créer une entrée d'historique
      await tx.stockHistory.create({
        data: {
          productId: id,
          quantity: quantity,
          type: operationType,
          note: note || `Ajustement manuel de ${Math.abs(difference)} ${product.unit}`
        }
      })

      // Mettre à jour ou créer le stock
      return await tx.stock.upsert({
        where: { productId: id },
        update: { quantity },
        create: {
          productId: id,
          quantity
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              producer: {
                select: {
                  companyName: true
                }
              }
            }
          }
        }
      })
    })

    // 6. Vérification des alertes de stock bas
    const LOW_STOCK_THRESHOLD = 10
    
    let shouldSendAlert = false
    
    // Alerte si le stock passe sous le seuil ou est déjà bas
    if ((oldStock && oldStock.quantity > LOW_STOCK_THRESHOLD && quantity <= LOW_STOCK_THRESHOLD) ||
        quantity <= LOW_STOCK_THRESHOLD) {
      shouldSendAlert = true
    }
    
    // Envoyer la notification si nécessaire (async, ne pas bloquer la réponse)
    if (shouldSendAlert) {
      NotificationService.sendLowStockNotification(id, quantity).catch(error => {
        console.error("Erreur envoi notification stock bas:", error)
      })
    }

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Stock modifié:`, {
      productId: id,
      modifiedBy: session.user.id,
      role: session.user.role,
      oldQuantity: oldStock?.quantity || 0,
      newQuantity: quantity,
      difference: quantity - (oldStock?.quantity || 0),
      lowStockAlert: shouldSendAlert,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Stock mis à jour: ${quantity} ${product.unit}`)

    return NextResponse.json(updatedStock)

  } catch (error) {
    console.error("❌ Erreur mise à jour stock:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['PATCH'],
  rateLimit: {
    requests: 30, // Modifications de stock limitées
    window: 60
  }
})