// app/api/orders/items/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    const { orderId, productId, quantity } = await req.json()

    if (!orderId || !productId || !quantity) {
      return new NextResponse(
        "Tous les champs sont requis", 
        { status: 400 }
      )
    }

    // Effectuer l'ajout dans une transaction
    const orderItem = await prisma.$transaction(async (tx) => {
      // 1. Vérifier le produit et le stock
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          stock: true
        }
      })

      if (!product) {
        throw new Error("Produit non trouvé")
      }

      if (!product.available) {
        throw new Error("Produit non disponible")
      }

      if (!product.stock || quantity > product.stock.quantity) {
        throw new Error("Stock insuffisant")
      }

      // 2. Vérifier que la commande existe et appartient à l'utilisateur
      const order = await tx.order.findUnique({
        where: { id: orderId }
      })

      if (!order || order.userId !== session.user.id) {
        throw new Error("Commande non trouvée ou non autorisée")
      }

      // 3. Vérifier si l'article existe déjà dans la commande
      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId,
          productId
        }
      })

      let orderItem;
      if (existingItem) {
        // Mise à jour de la quantité
        orderItem = await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity
          }
        })
      } else {
        // Création d'un nouvel article
        orderItem = await tx.orderItem.create({
          data: {
            orderId,
            productId,
            quantity,
            price: product.price
          }
        })
      }

      // 4. Mettre à jour le stock
      await tx.stock.update({
        where: { productId },
        data: {
          quantity: {
            decrement: quantity
          }
        }
      })

      // 5. Mettre à jour le total de la commande
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: {
          product: true
        }
      })

      const total = orderItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      )

      await tx.order.update({
        where: { id: orderId },
        data: { total }
      })

      return orderItem
    })

    return NextResponse.json(orderItem)
  } catch (error) {
    console.error("Erreur lors de l'ajout au panier:", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Erreur lors de l'ajout au panier",
      { status: 400 }
    )
  }
})