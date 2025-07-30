// app/api/orders/items/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Schéma de validation pour la mise à jour de quantité
const updateQuantitySchema = z.object({
  quantity: z.number()
    .positive('La quantité doit être positive')
    .max(10000, 'Quantité trop élevée')
    .refine(val => val % 0.01 === 0, 'Quantité invalide (2 décimales max)')
})

// PATCH - Mettre à jour la quantité d'un article du panier
export const PATCH = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const itemId = pathSegments[pathSegments.indexOf('items') + 1]

    const { id } = validateData(paramsSchema, { id: itemId })

    // 2. Validation des données de mise à jour
    const rawData = await request.json()
    const { quantity } = validateData(updateQuantitySchema, rawData)

    console.log(`✏️ Mise à jour quantité item ${id} vers ${quantity} par user ${session.user.id}`)

    // 3. Transaction atomique pour la mise à jour sécurisée
    const updatedItem = await prisma.$transaction(async (tx) => {
      // 3.1. Récupération sécurisée de l'article avec toutes les relations
      const orderItem = await tx.orderItem.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
              status: true
            }
          },
          product: {
            include: {
              stock: true,
              producer: {
                select: {
                  id: true,
                  companyName: true
                }
              }
            }
          }
        }
      })

      if (!orderItem) {
        throw createError.notFound("Article non trouvé")
      }

      // 3.2. SÉCURITÉ CRITIQUE: Vérifier ownership
      if (orderItem.order.userId !== session.user.id) {
        console.error(`🚨 Tentative modif item non autorisée: user ${session.user.id} -> item ${id}`)
        throw createError.forbidden("Non autorisé - Cet article ne vous appartient pas")
      }

      // 3.3. Validation du statut modifiable
      const editableStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.INVOICE_PENDING]
      if (!editableStatuses.includes(orderItem.order.status as OrderStatus)) {
        throw createError.validation(
          `Impossible de modifier cette commande (statut: ${orderItem.order.status})`
        )
      }

      // 3.4. Validation de la quantité minimale
      if (orderItem.product.minOrderQuantity && quantity < orderItem.product.minOrderQuantity) {
        throw createError.validation(
          `Quantité minimale requise: ${orderItem.product.minOrderQuantity} ${orderItem.product.unit}`
        )
      }

      // 3.5. Calcul sécurisé de la différence de stock
      const quantityDifference = quantity - orderItem.quantity

      // 3.6. Vérification du stock disponible
      if (quantityDifference > 0 && orderItem.product.stock) {
        if (orderItem.product.stock.quantity < quantityDifference) {
          throw createError.validation(
            `Stock insuffisant. Besoin de ${quantityDifference} ${orderItem.product.unit} supplémentaires, disponible: ${orderItem.product.stock.quantity}`
          )
        }
      }

      // 3.7. Mise à jour de l'article
      const updated = await tx.orderItem.update({
        where: { id },
        data: { 
          quantity,
          // Mettre à jour le prix au prix actuel pour cohérence
          price: orderItem.product.price
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              price: true,
              producer: {
                select: {
                  id: true,
                  companyName: true
                }
              }
            }
          }
        }
      })

      // 3.8. Mise à jour sécurisée du stock
      if (quantityDifference !== 0 && orderItem.product.stock) {
        await tx.stock.update({
          where: { productId: orderItem.product.id },
          data: {
            quantity: {
              decrement: quantityDifference // Peut être négatif (remise en stock)
            }
          }
        })
      }

      // 3.9. Recalcul du total de la commande
      const allOrderItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        include: {
          product: {
            select: { price: true }
          }
        }
      })

      const newTotal = allOrderItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      )

      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { total: newTotal }
      })

      console.log(`✅ Quantité mise à jour: ${orderItem.quantity} → ${quantity} (diff: ${quantityDifference})`)

      return updated
    })

    // 4. Log d'audit sécurisé
    console.log(`📋 Audit - Item modifié:`, {
      userId: session.user.id,
      itemId: id,
      newQuantity: quantity,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: `Quantité mise à jour: ${quantity}`
    })

  } catch (error) {
    console.error("❌ Erreur mise à jour item:", error)
    return handleError(error, request.url)
  }
})

// DELETE - Supprimer un article du panier
export const DELETE = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const itemId = pathSegments[pathSegments.indexOf('items') + 1]

    const { id } = validateData(paramsSchema, { id: itemId })

    console.log(`🗑️ Suppression item ${id} par user ${session.user.id}`)

    // 2. Transaction atomique pour la suppression sécurisée
    await prisma.$transaction(async (tx) => {
      // 2.1. Récupération sécurisée de l'article
      const orderItem = await tx.orderItem.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
              status: true
            }
          },
          product: {
            include: {
              stock: true
            }
          }
        }
      })

      if (!orderItem) {
        throw createError.notFound("Article non trouvé")
      }

      // 2.2. SÉCURITÉ CRITIQUE: Vérifier ownership
      if (orderItem.order.userId !== session.user.id) {
        console.error(`🚨 Tentative suppression item non autorisée: user ${session.user.id} -> item ${id}`)
        throw createError.forbidden("Non autorisé - Cet article ne vous appartient pas")
      }

      // 2.3. Validation du statut modifiable
      const editableStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.INVOICE_PENDING]
      if (!editableStatuses.includes(orderItem.order.status as OrderStatus)) {
        throw createError.validation(
          `Impossible de modifier cette commande (statut: ${orderItem.order.status})`
        )
      }

      // 2.4. Suppression de l'article
      await tx.orderItem.delete({
        where: { id }
      })

      // 2.5. Remise en stock sécurisée
      if (orderItem.product.stock) {
        await tx.stock.update({
          where: { productId: orderItem.product.id },
          data: {
            quantity: {
              increment: orderItem.quantity
            }
          }
        })
      }

      // 2.6. Recalcul du total de la commande
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        include: {
          product: {
            select: { price: true }
          }
        }
      })

      const newTotal = remainingItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      )

      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { total: newTotal }
      })

      console.log(`✅ Article supprimé et ${orderItem.quantity} ${orderItem.product.unit} remis en stock`)
    })

    // 3. Log d'audit sécurisé
    console.log(`📋 Audit - Item supprimé:`, {
      userId: session.user.id,
      itemId: id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Article supprimé du panier'
    }, { status: 200 })

  } catch (error) {
    console.error("❌ Erreur suppression item:", error)
    return handleError(error, request.url)
  }
})