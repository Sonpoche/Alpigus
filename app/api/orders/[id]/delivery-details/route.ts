// app/api/orders/[id]/delivery-details/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Interface pour les informations de livraison
interface DeliveryInfo {
  fullName?: string
  company?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  notes?: string
}

export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`🚚 Récupération détails livraison pour commande ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée de la commande
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    userId: true
                  }
                }
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
                    producer: {
                      select: {
                        id: true,
                        userId: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative accès détails livraison commande inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée")
    }

    // 3. Vérifications d'autorisation strictes (informations très sensibles)
    if (session.user.role === 'PRODUCER') {
      // Les producteurs ne peuvent voir que les détails des commandes contenant leurs produits
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, companyName: true }
      })

      if (!producer) {
        throw createError.notFound("Profil producteur non trouvé")
      }

      // Vérifier si ce producteur a des produits dans cette commande
      const hasProducts = order.items.some(item => 
        item.product.producer.id === producer.id
      )

      const hasBookings = order.bookings.some(booking => 
        booking.deliverySlot.product.producer.id === producer.id
      )

      if (!hasProducts && !hasBookings) {
        console.warn(`⚠️ Producteur ${session.user.id} tentative accès détails livraison non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Vous n'avez pas de produits dans cette commande")
      }

      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} accède aux détails livraison commande ${id}`)
    }
    else if (session.user.role === 'CLIENT') {
      // Les clients ne peuvent voir que leurs propres détails de livraison
      if (order.userId !== session.user.id) {
        console.warn(`⚠️ Client ${session.user.id} tentative accès détails livraison non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Cette commande ne vous appartient pas")
      }
    }
    // Les ADMIN peuvent voir tous les détails (pas de vérification supplémentaire)

    // 4. Parsing sécurisé des métadonnées de livraison
    let deliveryType = "pickup"
    let deliveryInfo: DeliveryInfo | null = null
    
    try {
      if (order.metadata) {
        const metadata = JSON.parse(order.metadata)
        deliveryType = metadata.deliveryType || "pickup"
        deliveryInfo = metadata.deliveryInfo as DeliveryInfo | undefined || null
      }
    } catch (error) {
      console.error("Erreur parsing metadata livraison:", error)
      throw createError.internal("Erreur lors de l'analyse des données de commande")
    }

    // 5. Validation que c'est bien une livraison à domicile
    if (deliveryType !== "delivery") {
      throw createError.validation(
        "Cette commande n'est pas en livraison à domicile - pas de détails de livraison disponibles"
      )
    }

    if (!deliveryInfo) {
      throw createError.notFound("Informations de livraison non disponibles")
    }

    // 6. Validation et nettoyage des données sensibles
    const sanitizedDeliveryInfo = {
      fullName: deliveryInfo.fullName || order.user.name || "Non spécifié",
      company: deliveryInfo.company || null,
      address: deliveryInfo.address || "Adresse non disponible",
      postalCode: deliveryInfo.postalCode || "",
      city: deliveryInfo.city || "",
      phone: deliveryInfo.phone || order.user.phone || "Téléphone non disponible",
      notes: deliveryInfo.notes || null,
      // Informations de validation
      isComplete: !!(deliveryInfo.fullName && deliveryInfo.address && deliveryInfo.postalCode && deliveryInfo.city)
    }

    // 7. Validation que les informations essentielles sont présentes
    if (!sanitizedDeliveryInfo.isComplete) {
      console.warn(`⚠️ Informations de livraison incomplètes pour commande ${id}`)
    }

    // 8. Log d'audit sécurisé (données très sensibles)
    console.log(`📋 Audit - Détails livraison consultés:`, {
      orderId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      hasCompleteInfo: sanitizedDeliveryInfo.isComplete,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Détails livraison récupérés pour commande ${id}`)

    return NextResponse.json({
      success: true,
      deliveryInfo: sanitizedDeliveryInfo,
      meta: {
        deliveryType: "delivery",
        isComplete: sanitizedDeliveryInfo.isComplete
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération détails livraison:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN', 'CLIENT'], 
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 30, // 30 consultations par minute (données très sensibles)
    window: 60
  }
})