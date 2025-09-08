// Chemin du fichier: app/api/cart/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { items } = await request.json()
    
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Panier vide' },
        { status: 400 }
      )
    }

    // Chercher une commande en cours ou en créer une nouvelle
    let order = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        status: OrderStatus.PENDING
      }
    })

    if (!order) {
      // Créer une nouvelle commande
      order = await prisma.order.create({
        data: {
          userId: session.user.id,
          status: OrderStatus.PENDING,
          total: 0
        }
      })
    } else {
      // Vider les items existants de la commande
      await prisma.orderItem.deleteMany({
        where: { orderId: order.id }
      })
    }

    // Ajouter les nouveaux items
    let total = 0
    
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product || !product.available) {
        continue
      }

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: item.quantity,
          price: product.price
        }
      })

      total += product.price * item.quantity
    }

    // Mettre à jour le total de la commande
    await prisma.order.update({
      where: { id: order.id },
      data: { total }
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      total
    })

  } catch (error) {
    console.error('Erreur sync panier:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}