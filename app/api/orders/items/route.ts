// app/api/orders/items/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { z } from "zod"

// Schéma de validation pour l'ajout d'un item
const addItemSchema = z.object({
  orderId: commonSchemas.id,
  productId: commonSchemas.id,
  quantity: z.number()
    .positive('La quantité doit être positive')
    .max(10000, 'Quantité trop élevée')
    .refine(val => val % 0.01 === 0, 'Quantité invalide (2 décimales max)')
})

export const POST = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Validation des données d'entrée
    const rawData = await request.json()
    const { orderId, productId, quantity } = validateData(addItemSchema, rawData)

    console.log(`🛒 Ajout item au panier: orderId=${orderId}, productId=${productId}, qty=${quantity} par user ${session.user.id}`)

    // 2. Transaction atomique pour l'ajout sécurisé
    const orderItem = await prisma.$transaction(async (tx) => {
      // 2.1. Vérification sécurisée du produit et du stock
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          stock: true,
          producer: {
            select: {
              id: true,
              companyName: true,
              userId: true
            }
          }
        }
      })

      if (!product) {
        throw createError.notFound("Produit non trouvé")
      }

      if (!product.available) {
        throw createError.validation("Produit non disponible")
      }
      
      // 2.2. Gestion sécurisée du stock
      if (!product.stock) {
        // Créer un stock à zéro s'il n'existe pas
        await tx.stock.create({
          data: {
            productId: product.id,
            quantity: 0
          }
        })
        throw createError.validation("Stock insuffisant (stock créé)")
      }
      
      if (product.stock.quantity < quantity) {
        throw createError.validation(
          `Stock insuffisant. Disponible: ${product.stock.quantity} ${product.unit}, demandé: ${quantity} ${product.unit}`
        )
      }

      // 2.3. Validation de la quantité minimale
      if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
        throw createError.validation(
          `Quantité minimale requise: ${product.minOrderQuantity} ${product.unit}`
        )
      }

      // 2.4. Vérification sécurisée de la commande
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true
        }
      })

      if (!order) {
        throw createError.notFound("Commande non trouvée")
      }
      
      // SÉCURITÉ CRITIQUE: Vérifier ownership de la commande
      if (order.userId !== session.user.id) {
        console.error(`🚨 Tentative ajout item commande non autorisée: user ${session.user.id} -> commande ${orderId}`)
        throw createError.forbidden("Non autorisé - Cette commande ne vous appartient pas")
      }

      // 2.5. Validation du statut de commande modifiable
      const editableStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.INVOICE_PENDING]
      if (!editableStatuses.includes(order.status as OrderStatus)) {
        throw createError.validation(
          `Impossible de modifier cette commande (statut: ${order.status})`
        )
      }

      // 2.6. Vérification paiement différé si nécessaire
      if (order.status === OrderStatus.INVOICE_PENDING && !product.acceptDeferred) {
        throw createError.validation(
          "Ce produit n'accepte pas le paiement différé"
        )
      }

      // 2.7. Gestion de l'item existant ou création
      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId,
          productId
        }
      })

      let orderItem
      let actualQuantityAdded = quantity

      if (existingItem) {
        // Vérifier que le stock peut supporter la quantité totale
        const newTotalQuantity = existingItem.quantity + quantity
        if (product.stock.quantity < quantity) { // On vérifie juste la quantité à ajouter
          throw createError.validation(
            `Stock insuffisant pour cette quantité supplémentaire`
          )
        }

        orderItem = await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newTotalQuantity,
            // Utiliser le prix actuel du produit pour cohérence
            price: product.price
          }
        })
      } else {
        // Création d'un nouvel article
        orderItem = await tx.orderItem.create({
          data: {
            orderId,
            productId,
            quantity,
            price: product.price // SÉCURITÉ: Toujours utiliser le prix de la DB
          }
        })
      }

      // 2.8. Mise à jour sécurisée du stock
      await tx.stock.update({
        where: { productId },
        data: {
          quantity: {
            decrement: actualQuantityAdded
          }
        }
      })

      // 2.9. Recalcul sécurisé du total de la commande
      const allOrderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: {
          product: {
            select: {
              price: true // Utiliser le prix actuel pour recalcul
            }
          }
        }
      })

      const newTotal = allOrderItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      )

      await tx.order.update({
        where: { id: orderId },
        data: { total: newTotal }
      })

      console.log(`✅ Item ajouté: ${quantity} ${product.unit} de ${product.name} (nouveau total: ${newTotal} CHF)`)

      return {
        ...orderItem,
        product: {
          id: product.id,
          name: product.name,
          unit: product.unit,
          price: product.price,
          producer: product.producer
        }
      }
    })

    // 3. Log d'audit sécurisé
    console.log(`📋 Audit - Item ajouté au panier:`, {
      userId: session.user.id,
      orderId,
      productId,
      quantity,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      item: orderItem,
      message: `${quantity} article(s) ajouté(s) au panier`
    })

  } catch (error) {
    console.error("❌ Erreur ajout item au panier:", error)
    return handleError(error, request.url)
  }
})