// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// GET - Récupérer une commande par ID
export const GET = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`🔍 Récupération commande ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée de la commande avec toutes les relations
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    id: true,
                    companyName: true,
                    userId: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
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
                      select: {
                        id: true,
                        companyName: true,
                        userId: true,
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            paidAt: true,
            paymentMethod: true
          }
        }
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative accès commande inexistante ${id} par user ${session.user.id}`)
      throw createError.notFound("Commande non trouvée")
    }

    // 3. Vérifications d'autorisation selon le rôle
    if (session.user.role === 'CLIENT') {
      // Les clients ne peuvent voir que leurs propres commandes
      if (order.userId !== session.user.id) {
        console.warn(`⚠️ Client ${session.user.id} tentative accès commande non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Cette commande ne vous appartient pas")
      }
    } 
    else if (session.user.role === 'PRODUCER') {
      // Les producteurs ne peuvent voir que les commandes contenant leurs produits
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
        console.warn(`⚠️ Producteur ${session.user.id} tentative accès commande non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Vous n'avez pas de produits dans cette commande")
      }

      console.log(`🏭 Producteur ${producer.companyName || 'Inconnu'} accède à commande ${id}`)
    }
    // Les ADMIN peuvent voir toutes les commandes (pas de vérification supplémentaire)

    // 4. Filtrage des données selon le rôle pour la réponse
    let responseOrder = order

    if (session.user.role === 'PRODUCER') {
      // Pour les producteurs, filtrer pour ne montrer que leurs produits
      const producer = await prisma.producer.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })

      if (producer) {
        // Filtrer les items
        const filteredItems = order.items.filter(item => 
          item.product.producer.id === producer.id
        )
        
        // Filtrer les bookings
        const filteredBookings = order.bookings.filter(booking => 
          booking.deliverySlot.product.producer.id === producer.id
        )

        // Recalculer le total pour ce producteur seulement
        const producerItemsTotal = filteredItems.reduce(
          (sum, item) => sum + (item.price * item.quantity), 0
        )

        const producerBookingsTotal = filteredBookings.reduce(
          (sum, booking) => {
            const price = booking.price || booking.deliverySlot.product.price
            return sum + (price * booking.quantity)
          }, 0
        )

        const producerTotal = producerItemsTotal + producerBookingsTotal

        responseOrder = {
          ...order,
          items: filteredItems,
          bookings: filteredBookings,
          total: producerTotal // Total spécifique au producteur
          // Note: le total original reste accessible via order.total si nécessaire
        } as any // Cast temporaire pour éviter l'erreur TypeScript
      }
    }

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Commande consultée:`, {
      orderId: id,
      consultedBy: session.user.id,
      role: session.user.role,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Commande ${id} récupérée avec succès pour ${session.user.role} ${session.user.id}`)

    return NextResponse.json(responseOrder)

  } catch (error) {
    console.error("❌ Erreur récupération commande:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'PRODUCER', 'ADMIN'],
  allowedMethods: ['GET'],
  rateLimit: {
    requests: 100, // 100 consultations par minute
    window: 60
  }
})

// DELETE - Supprimer une commande (CLIENT et ADMIN uniquement)
export const DELETE = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`🗑️ Suppression commande ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Récupération sécurisée de la commande
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              select: {
                id: true,
                product: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    if (!order) {
      throw createError.notFound("Commande non trouvée")
    }

    // 3. Vérifications d'autorisation pour la suppression
    if (session.user.role === 'CLIENT') {
      // CLIENT: Peut supprimer seulement ses propres commandes
      if (order.userId !== session.user.id) {
        console.warn(`⚠️ Client ${session.user.id} tentative suppression commande non autorisée ${id}`)
        throw createError.forbidden("Non autorisé - Cette commande ne vous appartient pas")
      }
    }
    // ADMIN: Peut supprimer toutes les commandes (pas de vérification supplémentaire)

    // 4. Validation des règles métier pour la suppression
    const nonDeletableStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED, 
      OrderStatus.SHIPPED, 
      OrderStatus.DELIVERED
    ]

    if (nonDeletableStatuses.includes(order.status as OrderStatus)) {
      throw createError.validation(
        `Impossible de supprimer une commande avec le statut: ${order.status}`
      )
    }

    // 5. Vérifier qu'il n'y a pas de facture payée
    if (order.invoice && order.invoice.status === 'PAID') {
      throw createError.validation(
        "Impossible de supprimer une commande avec une facture payée"
      )
    }

    // 6. Suppression sécurisée avec remise en stock
    await prisma.$transaction(async (tx) => {
      // 6.1. Remettre les articles en stock
      for (const item of order.items) {
        await tx.stock.update({
          where: { productId: item.product.id },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
      }

      // 6.2. Libérer les créneaux de réservation
      for (const booking of order.bookings) {
        await tx.deliverySlot.update({
          where: { id: booking.slotId },
          data: {
            reserved: {
              decrement: booking.quantity
            }
          }
        })

        // Remettre en stock aussi
        await tx.stock.update({
          where: { productId: booking.deliverySlot.product.id },
          data: {
            quantity: {
              increment: booking.quantity
            }
          }
        })
      }

      // 6.3. Supprimer la commande (cascade supprimera items, bookings, invoice)
      await tx.order.delete({
        where: { id }
      })
    })

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Commande supprimée:`, {
      orderId: id,
      deletedBy: session.user.id,
      role: session.user.role,
      itemsCount: order.items.length,
      bookingsCount: order.bookings.length,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Commande ${id} supprimée avec succès et stock remis à jour`)

    return NextResponse.json({
      success: true,
      message: 'Commande supprimée avec succès'
    })

  } catch (error) {
    console.error("❌ Erreur suppression commande:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT', 'ADMIN'], // Seuls CLIENT et ADMIN peuvent supprimer
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 10, // 10 suppressions max par minute
    window: 60
  }
})