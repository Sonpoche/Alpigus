// app/api/products/[id]/stock/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const stock = await prisma.stock.findUnique({
      where: { productId: context.params.id },
      include: {
        product: {
          include: {
            producer: true
          }
        }
      }
    })

    if (!stock) {
      return new NextResponse("Stock non trouvé", { status: 404 })
    }

    return NextResponse.json(stock)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération du stock", { status: 500 })
  }
})

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const body = await req.json()
      const { quantity } = body

      if (typeof quantity !== 'number' || quantity < 0) {
        return new NextResponse("Quantité invalide", { status: 400 })
      }

      // Vérifier que le produit appartient au producteur
      const product = await prisma.product.findUnique({
        where: { id: context.params.id },
        include: { producer: true }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      if (product.producer.userId !== session.user.id && session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Mettre à jour ou créer le stock
      const stock = await prisma.stock.upsert({
        where: { productId: context.params.id },
        update: { quantity },
        create: {
          productId: context.params.id,
          quantity
        }
      })

      return NextResponse.json(stock)
    } catch (error) {
      return new NextResponse("Erreur lors de la mise à jour du stock", { status: 500 })
    }
  },
  ["PRODUCER", "ADMIN"]
)