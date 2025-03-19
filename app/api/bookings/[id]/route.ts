// app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

// Supprimer/Annuler une réservation
export const DELETE = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const bookingId = context.params.id
    
    // Récupérer la réservation pour vérifier si elle appartient à l'utilisateur
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        order: true,
        deliverySlot: {
          include: {
            product: {
              include: {
                stock: true
              }
            }
          }
        }
      }
    })
    
    if (!booking) {
      return new NextResponse("Réservation non trouvée", { status: 404 })
    }
    
    // Vérifier que la réservation appartient à l'utilisateur
    if (booking.order.userId !== session.user.id) {
      return new NextResponse("Non autorisé", { status: 403 })
    }
    
    // Effectuer les mises à jour dans une transaction
    await prisma.$transaction(async (tx) => {
      // 1. Marquer la réservation comme annulée
      await tx.booking.delete({
        where: { id: bookingId }
      })
      
      // 2. Libérer le créneau
      await tx.deliverySlot.update({
        where: { id: booking.slotId },
        data: {
          reserved: {
            decrement: booking.quantity
          }
        }
      })
      
      // 3. Remettre la quantité en stock
      if (booking.deliverySlot.product.stock) {
        await tx.stock.update({
          where: { productId: booking.deliverySlot.product.id },
          data: {
            quantity: {
              increment: booking.quantity
            }
          }
        })
      }
    })
    
    // Important: Attendez que tout soit complété
    await prisma.$disconnect()
    
    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    console.error("Erreur lors de l'annulation de la réservation:", error)
    return new NextResponse(
      "Erreur lors de l'annulation de la réservation", 
      { status: 500 }
    )
  }
})

// Obtenir les détails d'une réservation
export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const bookingId = context.params.id
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        order: true,
        deliverySlot: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!booking) {
      return new NextResponse("Réservation non trouvée", { status: 404 })
    }
    
    // Vérifier que la réservation appartient à l'utilisateur ou qu'il est admin/producteur
    if (booking.order.userId !== session.user.id && session.user.role !== 'ADMIN') {
      // Si c'est un producteur, vérifier qu'il s'agit de son produit
      if (session.user.role === 'PRODUCER') {
        const producer = await prisma.producer.findUnique({
          where: { userId: session.user.id }
        })
        
        if (!producer || booking.deliverySlot.product.producerId !== producer.id) {
          return new NextResponse("Non autorisé", { status: 403 })
        }
      } else {
        return new NextResponse("Non autorisé", { status: 403 })
      }
    }
    
    return NextResponse.json(booking)
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la réservation:", error)
    return new NextResponse(
      "Erreur lors de la récupération de la réservation", 
      { status: 500 }
    )
  }
})

// Mettre à jour une réservation (par exemple pour changer sa quantité)
export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const bookingId = context.params.id
      const body = await req.json()
      const { quantity, status } = body
      
      // Récupérer la réservation existante
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          order: true,
          deliverySlot: {
            include: {
              product: {
                include: {
                  stock: true
                }
              }
            }
          }
        }
      })
      
      if (!booking) {
        return new NextResponse("Réservation non trouvée", { status: 404 })
      }
      
      // Vérifier les autorisations
      if (booking.order.userId !== session.user.id && session.user.role !== 'ADMIN') {
        // Si c'est un producteur, vérifier qu'il s'agit de son produit
        if (session.user.role === 'PRODUCER') {
          const producer = await prisma.producer.findUnique({
            where: { userId: session.user.id }
          })
          
          if (!producer || booking.deliverySlot.product.producerId !== producer.id) {
            return new NextResponse("Non autorisé", { status: 403 })
          }
        } else {
          return new NextResponse("Non autorisé", { status: 403 })
        }
      }
      
      // Si la quantité est modifiée
      if (quantity !== undefined && quantity !== booking.quantity) {
        const quantityDifference = quantity - booking.quantity
        
        // Vérifier si le créneau a assez d'espace
        const deliverySlot = booking.deliverySlot
        const availableCapacity = deliverySlot.maxCapacity - deliverySlot.reserved
        
        if (quantityDifference > 0 && quantityDifference > availableCapacity) {
          return new NextResponse("Capacité du créneau insuffisante", { status: 400 })
        }
        
        // Vérifier si le stock est suffisant
        if (quantityDifference > 0 && deliverySlot.product.stock && 
            quantityDifference > deliverySlot.product.stock.quantity) {
          return new NextResponse("Stock insuffisant", { status: 400 })
        }
      }
      
      // Effectuer les mises à jour dans une transaction
      const updatedBooking = await prisma.$transaction(async (tx) => {
        let updateData: any = {}
        
        // Mettre à jour le statut si fourni
        if (status) {
          updateData.status = status
        }
        
        // Si la quantité est modifiée
        if (quantity !== undefined && quantity !== booking.quantity) {
          const quantityDifference = quantity - booking.quantity
          updateData.quantity = quantity
          
          // Mettre à jour le créneau
          await tx.deliverySlot.update({
            where: { id: booking.slotId },
            data: {
              reserved: {
                increment: quantityDifference
              }
            }
          })
          
          // Mettre à jour le stock
          if (booking.deliverySlot.product.stock) {
            await tx.stock.update({
              where: { productId: booking.deliverySlot.product.id },
              data: {
                quantity: {
                  decrement: quantityDifference
                }
              }
            })
          }
        }
        
        // Mettre à jour la réservation
        return tx.booking.update({
          where: { id: bookingId },
          data: updateData,
          include: {
            deliverySlot: {
              include: {
                product: true
              }
            }
          }
        })
      })
      
      return NextResponse.json(updatedBooking)
      
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la réservation:", error)
      return new NextResponse(
        "Erreur lors de la mise à jour de la réservation", 
        { status: 500 }
      )
    }
  },
  ["CLIENT", "ADMIN", "PRODUCER"]
)