// app/api/delivery-slots/[id]/book/route.ts - Version sécurisée
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData } from "@/lib/api-security"
import { prisma } from "@/lib/prisma"
import { createError } from "@/lib/error-handler"
import { NotificationService } from "@/lib/notification-service"
import { z } from "zod"

// Schéma de validation pour la réservation
const bookSlotSchema = z.object({
  quantity: z.number().min(0.1, 'Quantité minimale 0.1').max(1000, 'Quantité maximale 1000'),
  orderId: z.string().cuid('ID de commande invalide')
}).strict()

export const POST = withAuthSecurity(async (
  request: NextRequest,
  session
) => {
  try {
    // Extraction et validation de l'ID du créneau
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const slotId = pathParts[pathParts.indexOf('delivery-slots') + 1]
    
    if (!slotId || !slotId.match(/^[a-zA-Z0-9]+$/)) {
      throw createError.validation("ID de créneau invalide")
    }
    
    // Validation des données d'entrée
    const rawData = await request.json()
    const { quantity, orderId } = validateData(bookSlotSchema, rawData)
    
    console.log(`Client ${session.user.id} réserve ${quantity} unités sur le créneau ${slotId}`)
    
    // Calculer la date d'expiration (2 heures par défaut)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)
    
    // Effectuer la réservation dans une transaction atomique
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Vérifier et récupérer le créneau
      const slot = await tx.deliverySlot.findUnique({
        where: { id: slotId },
        include: {
          product: {
            include: {
              stock: {
                select: {
                  quantity: true
                }
              },
              producer: {
                select: {
                  id: true,
                  companyName: true
                }
              }
            }
          }
        }
      })
      
      if (!slot) {
        throw createError.notFound("Créneau de livraison non trouvé")
      }
      
      if (!slot.isAvailable) {
        throw createError.validation("Ce créneau n'est pas disponible")
      }
      
      // Vérifier que le créneau n'est pas dans le passé
      if (slot.date < new Date()) {
        throw createError.validation("Impossible de réserver un créneau passé")
      }
      
      // Vérifier la capacité disponible
      const availableCapacity = slot.maxCapacity - slot.reserved
      if (quantity > availableCapacity) {
        throw createError.validation(
          `Capacité insuffisante. Disponible: ${availableCapacity}, demandé: ${quantity}`
        )
      }
      
      // 2. Vérifier le stock du produit
      if (!slot.product.stock || quantity > slot.product.stock.quantity) {
        throw createError.validation(
          `Stock insuffisant. Disponible: ${slot.product.stock?.quantity || 0}, demandé: ${quantity}`
        )
      }
      
      // 3. Vérifier et récupérer la commande
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true
        }
      })
      
      if (!order) {
        throw createError.notFound("Commande non trouvée")
      }
      
      if (order.userId !== session.user.id) {
        throw createError.forbidden("Cette commande ne vous appartient pas")
      }
      
      // Vérifier que la commande peut être modifiée
      if (!['DRAFT', 'PENDING'].includes(order.status)) {
        throw createError.validation("Cette commande ne peut plus être modifiée")
      }
      
      // 4. Vérifier qu'il n'y a pas déjà une réservation pour ce produit dans cette commande
      const existingBooking = await tx.booking.findFirst({
        where: {
          orderId,
          deliverySlot: {
            productId: slot.productId
          }
        }
      })
      
      if (existingBooking) {
        throw createError.validation("Vous avez déjà une réservation pour ce produit dans cette commande")
      }
      
      // 5. Créer la réservation
      const newBooking = await tx.booking.create({
        data: {
          slotId: slot.id,
          orderId,
          quantity,
          price: slot.product.price,
          status: "TEMPORARY",
          expiresAt
        },
        include: {
          deliverySlot: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true,
                  price: true
                }
              }
            }
          }
        }
      })
      
      // 6. Mettre à jour la capacité réservée du créneau
      await tx.deliverySlot.update({
        where: { id: slot.id },
        data: {
          reserved: {
            increment: quantity
          }
        }
      })
      
      // 7. Réduire le stock du produit
      await tx.stock.update({
        where: { productId: slot.product.id },
        data: {
          quantity: {
            decrement: quantity
          }
        }
      })
      
      // 8. Recalculer et mettre à jour le total de la commande
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        select: {
          price: true,
          quantity: true
        }
      })
      
      const allBookings = await tx.booking.findMany({
        where: { orderId },
        select: {
          price: true,
          quantity: true
        }
      })
      
      const itemsTotal = orderItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      )
      
      const bookingsTotal = allBookings.reduce((sum, booking) => 
        sum + ((booking.price || 0) * booking.quantity), 0
      )
      
      const newTotal = itemsTotal + bookingsTotal
      
      await tx.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          updatedAt: new Date()
        }
      })
      
      console.log(`Réservation créée: ${quantity} ${slot.product.unit} pour ${quantity * slot.product.price}€`)
      
      return newBooking
    })
    
    // Récupérer la réservation complète pour les notifications
    const bookingWithDetails = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        deliverySlot: {
          include: {
            product: {
              include: {
                producer: {
                  select: {
                    companyName: true
                  }
                }
              }
            }
          }
        },
        order: {
          select: {
            id: true,
            total: true
          }
        }
      }
    })
    
    // Envoyer une notification au client
    try {
      if (bookingWithDetails) {
        await NotificationService.sendDeliveryBookingNotification(bookingWithDetails)
        console.log(`Notification de réservation envoyée au client ${session.user.id}`)
      }
    } catch (notificationError) {
      console.error('Erreur notification (non critique):', notificationError)
    }
    
    // Enrichir la réponse
    const enrichedBooking = {
      ...booking,
      expirationInfo: {
        expiresAt,
        expiresInMinutes: Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60)),
        isTemporary: true
      },
      deliveryInfo: {
        date: booking.deliverySlot.date,
        productName: booking.deliverySlot.product.name,
        unit: booking.deliverySlot.product.unit,
        totalValue: quantity * (booking.price || booking.deliverySlot.product.price)
      }
    }
    
    console.log(`Réservation ${booking.id} créée avec succès, expire à ${expiresAt.toISOString()}`)
    
    return NextResponse.json({
      success: true,
      booking: enrichedBooking,
      message: `Réservation créée avec succès. Vous avez 2 heures pour finaliser votre commande.`,
      warning: "Cette réservation est temporaire et expirera automatiquement si la commande n'est pas finalisée."
    }, { status: 201 })
    
  } catch (error) {
    console.error("Erreur lors de la réservation:", error)
    throw error
  }
}, {
  requireAuth: true,
  allowedRoles: ['CLIENT'],
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 20,
    window: 60 // Limiter à 20 réservations par minute
  }
})