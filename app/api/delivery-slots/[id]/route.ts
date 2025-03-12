// app/api/delivery-slots/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { UserRole } from "@prisma/client"

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const slot = await prisma.deliverySlot.findUnique({
      where: { id: context.params.id },
      include: {
        product: {
          include: {
            stock: true,
            producer: true
          }
        },
        bookings: true
      }
    })

    if (!slot) {
      return new NextResponse("Créneau non trouvé", { status: 404 })
    }

    // Pour les producteurs, vérifier qu'ils sont propriétaires du créneau
    if (session.user.role === UserRole.PRODUCER && 
        slot.product.producer.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    return NextResponse.json(slot)
  } catch (error) {
    return new NextResponse(
      "Erreur lors de la récupération du créneau", 
      { status: 500 }
    )
  }
})

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      // Vérifier que le créneau existe
      const slot = await prisma.deliverySlot.findUnique({
        where: { id: context.params.id },
        include: {
          product: {
            include: {
              producer: true,
              stock: true
            }
          }
        }
      })

      if (!slot) {
        return new NextResponse("Créneau non trouvé", { status: 404 })
      }

      // Vérifier que le producteur est propriétaire du produit
      if (slot.product.producer.userId !== session.user.id && 
          session.user.role !== UserRole.ADMIN) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const body = await req.json()
      const { maxCapacity, isAvailable } = body

      if (maxCapacity !== undefined) {
        // Vérifier que la nouvelle capacité peut accommoder les réservations existantes
        if (maxCapacity < slot.reserved) {
          return new NextResponse(
            "La capacité ne peut pas être inférieure aux réservations existantes", 
            { status: 400 }
          )
        }

        // Vérifier que la capacité ne dépasse pas le stock
        if (!slot.product.stock || maxCapacity > slot.product.stock.quantity) {
          return new NextResponse(
            "La capacité ne peut pas dépasser le stock disponible", 
            { status: 400 }
          )
        }
      }

      const updatedSlot = await prisma.deliverySlot.update({
        where: { id: context.params.id },
        data: {
          ...(maxCapacity !== undefined && { maxCapacity }),
          ...(isAvailable !== undefined && { isAvailable })
        },
        include: {
          product: {
            include: {
              stock: true,
              producer: true
            }
          },
          bookings: true
        }
      })

      return NextResponse.json(updatedSlot)
    } catch (error) {
      console.error("Erreur lors de la mise à jour du créneau:", error)
      return new NextResponse(
        "Erreur lors de la mise à jour du créneau", 
        { status: 500 }
      )
    }
  },
  ["PRODUCER", "ADMIN"]
)

export const DELETE = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const slot = await prisma.deliverySlot.findUnique({
        where: { id: context.params.id },
        include: {
          product: {
            include: {
              producer: true
            }
          },
          bookings: true
        }
      })

      if (!slot) {
        return new NextResponse("Créneau non trouvé", { status: 404 })
      }

      if (slot.product.producer.userId !== session.user.id && 
          session.user.role !== UserRole.ADMIN) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Vérifier s'il y a des réservations
      if (slot.bookings.length > 0) {
        return new NextResponse(
          "Impossible de supprimer un créneau avec des réservations", 
          { status: 400 }
        )
      }

      await prisma.deliverySlot.delete({
        where: { id: context.params.id }
      })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      console.error("Erreur lors de la suppression du créneau:", error)
      return new NextResponse(
        "Erreur lors de la suppression du créneau", 
        { status: 500 }
      )
    }
  },
  ["PRODUCER", "ADMIN"]
)