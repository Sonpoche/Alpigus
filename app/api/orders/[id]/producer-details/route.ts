// app/api/orders/[id]/producer-details/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`🏭 Récupération détails producteur pour commande ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée de la commande avec informations producteur
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        phone: true,
                        name: true,
                        email: true
                      }
                    }
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
                      include: {
                        user: {
                          select: {
                            id: true,
                            phone: true,
                            name: true,
                            email: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative accès détails producteur commande inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée")
    }

    // 3. Vérifications d'autorisation strictes
    const isAdmin = session.user.role === 'ADMIN'
    const isOrderOwner = order.userId === session.user.id
    
    // Vérifier si l'utilisateur est un producteur concerné par cette commande
    let isProducer = false
    if (session.user.role === 'PRODUCER') {
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })

      if (producer) {
        isProducer = order.items.some(item => 
          item.product.producer.id === producer.id
        ) || order.bookings.some(booking => 
          booking.deliverySlot.product.producer.id === producer.id
        )
      }
    }

    // SÉCURITÉ CRITIQUE: Seuls admin, propriétaire de commande, ou producteur concerné
    if (!isAdmin && !isOrderOwner && !isProducer) {
      console.warn(`⚠️ Accès non autorisé détails producteur commande ${id} par user ${session.user.id}`)
      throw createError.forbidden("Non autorisé - Vous n'avez pas accès aux détails de cette commande")
    }

    // 4. Déterminer le producteur principal
    let producer = null
    if (order.items.length > 0) {
      producer = order.items[0].product.producer
    } else if (order.bookings.length > 0) {
      producer = order.bookings[0].deliverySlot.product.producer
    } else {
      throw createError.validation("Aucun produit dans la commande")
    }

    // 5. Vérification du mode de livraison (retrait sur place uniquement)
    let deliveryType = "pickup"
    try {
      if (order.metadata) {
        const metadata = JSON.parse(order.metadata)
        deliveryType = metadata.deliveryType || "pickup"
      }
    } catch (error) {
      console.error("Erreur parsing metadata commande:", error)
    }

    if (deliveryType !== "pickup") {
      throw createError.validation(
        "Cette commande n'est pas en retrait sur place - détails producteur non nécessaires"
      )
    }

    // 6. Validation que les informations producteur sont disponibles
    if (!producer.address || !producer.user?.phone) {
      console.warn(`⚠️ Informations producteur incomplètes pour commande ${id}`)
      throw createError.validation("Informations producteur incomplètes")
    }

    // 7. Formatage sécurisé des données de réponse
    const producerDetails = {
      companyName: producer.companyName || producer.user.name || "Producteur",
      address: producer.address || "Adresse non disponible",
      phone: producer.user?.phone || "Téléphone non disponible",
      // Informations complémentaires sécurisées
      contactName: producer.user?.name || "Non disponible",
      // Ne pas exposer l'email par défaut pour la sécurité
      ...(isAdmin && { email: producer.user?.email })
    }

    // 8. Log d'audit sécurisé (informations sensibles)
    console.log(`📋 Audit - Détails producteur consultés:`, {
      orderId: id,
      producerId: producer.id,
      consultedBy: session.user.id,
      role: session.user.role,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Détails producteur récupérés pour commande ${id}`)

    return NextResponse.json({
      success: true,
      producer: producerDetails,
      deliveryInfo: {
        type: "pickup",
        note: "Retrait sur place chez le producteur"
      }
    })

  } catch (error) {
    console.error("❌ Erreur récupération détails producteur:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 50, // 50 consultations par minute (information sensible)
    window: 60
  }
})