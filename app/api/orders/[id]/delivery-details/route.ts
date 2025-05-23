// app/api/orders/[id]/delivery-details/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

interface DeliveryInfo {
  fullName?: string
  company?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  notes?: string
}

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id

    // Vérifier si l'utilisateur est un producteur ou un admin
    if (!session.user?.role || (session.user.role !== 'PRODUCER' && session.user.role !== 'ADMIN')) {
      return new NextResponse("Non autorisé", { status: 403 })
    }

    // Récupérer la commande avec tous ses détails
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: true
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return new NextResponse("Commande non trouvée", { status: 404 })
    }

    // Si c'est un producteur, vérifier qu'il a des produits dans cette commande
    if (session.user.role === 'PRODUCER') {
      if (!session.user.id) {
        return new NextResponse("ID utilisateur manquant", { status: 400 })
      }

      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id }
      })

      if (!producer) {
        return new NextResponse("Producteur non trouvé", { status: 404 })
      }

      // Vérifier si ce producteur a des produits dans cette commande
      const hasProducts = order.items.some(item => 
        item.product.producer.id === producer.id
      )

      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producer.id === producer.id
      )

      if (!hasProducts && !hasBookings) {
        return new NextResponse("Non autorisé - Vous n'avez pas de produits dans cette commande", { status: 403 })
      }
    }

    // Vérifier si la commande est en mode "delivery" (livraison à domicile)
    let deliveryType = "pickup"
    let deliveryInfo: DeliveryInfo | null = null
    
    try {
      if (order.metadata) {
        const metadata = JSON.parse(order.metadata)
        deliveryType = metadata.deliveryType || "pickup"
        deliveryInfo = metadata.deliveryInfo as DeliveryInfo | undefined || null
      }
    } catch (error) {
      console.error("Erreur lors du parsing du metadata:", error)
    }

    if (deliveryType !== "delivery") {
      return new NextResponse("Cette commande n'est pas en livraison à domicile", { status: 400 })
    }

    if (!deliveryInfo) {
      return new NextResponse("Informations de livraison non disponibles", { status: 404 })
    }

    return NextResponse.json({
      fullName: deliveryInfo.fullName || "Non spécifié",
      company: deliveryInfo.company || null,
      address: deliveryInfo.address || "Adresse non disponible",
      postalCode: deliveryInfo.postalCode || "",
      city: deliveryInfo.city || "",
      phone: deliveryInfo.phone || "Téléphone non disponible",
      notes: deliveryInfo.notes || null
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de livraison:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}, ["PRODUCER", "ADMIN"])