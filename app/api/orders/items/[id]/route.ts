// app/api/orders/items/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

// Mettre à jour un article du panier
export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const itemId = context.params.id
    
    // Récupérer le corps de la requête
    const body = await req.json()
    const { quantity } = body
    
    if (quantity === undefined || quantity <= 0) {
      return new NextResponse("Quantité invalide", { status: 400 })
    }
    
    // Récupérer l'article pour vérifier s'il appartient à l'utilisateur
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        product: {
          include: {
            stock: true
          }
        }
      }
    })
    
    if (!orderItem) {
      return new NextResponse("Article non trouvé", { status: 404 })
    }
    
    // Vérifier que l'article appartient à l'utilisateur
    if (orderItem.order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 })
    }
    
    // Calculer la différence de quantité pour la mise à jour du stock
    const quantityDifference = quantity - orderItem.quantity
    
    // Vérifier si le stock est suffisant
    if (orderItem.product.stock && quantityDifference > 0) {
      if (orderItem.product.stock.quantity < quantityDifference) {
        return new NextResponse("Stock insuffisant", { status: 400 })
      }
    }
    
    // Effectuer les mises à jour dans une transaction
    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour l'article
      const updated = await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity },
        include: {
          product: true
        }
      })
      
      // 2. Mettre à jour le stock
      if (quantityDifference !== 0 && orderItem.product.stock) {
        await tx.stock.update({
          where: { productId: orderItem.product.id },
          data: {
            quantity: {
              decrement: quantityDifference
            }
          }
        })
      }
      
      // 3. Recalculer le total de la commande
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        include: {
          product: true
        }
      })
      
      const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { total }
      })
      
      return updated
    })
    
    return NextResponse.json(updatedItem)
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article:", error)
    return new NextResponse(
      "Erreur lors de la mise à jour de l'article", 
      { status: 500 }
    )
  }
})

// Supprimer un article du panier
export const DELETE = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const itemId = context.params.id
    
    // Récupérer l'article pour vérifier s'il appartient à l'utilisateur
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        product: {
          include: {
            stock: true
          }
        }
      }
    })
    
    if (!orderItem) {
      return new NextResponse("Article non trouvé", { status: 404 })
    }
    
    // Vérifier que l'article appartient à l'utilisateur
    if (orderItem.order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 })
    }
    
    // Effectuer les mises à jour dans une transaction
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer l'article
      await tx.orderItem.delete({
        where: { id: itemId }
      })
      
      // 2. Remettre la quantité en stock
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
      
      // 3. Recalculer le total de la commande
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        include: {
          product: true
        }
      })
      
      const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { total }
      })
    })
    
    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    console.error("Erreur lors de la suppression de l'article:", error)
    return new NextResponse(
      "Erreur lors de la suppression de l'article", 
      { status: 500 }
    )
  }
})